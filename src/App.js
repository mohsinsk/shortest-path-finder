import React, { useState, useEffect } from "react";
import {
  TextField,
  Autocomplete,
  Button,
  Box,
  Container,
  Typography,
} from "@mui/material";
import {
  GoogleMap,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import jsPDF from "jspdf";
import "jspdf-autotable";
import debounce from "lodash.debounce";

const containerStyle = {
  width: "100%",
  height: "500px",
};

const libraries = ["places"];

const API_KEY = "AIzaSyBi45alRoNxtvVq-ji0zKaw12KLCSXGkkY";

const App = () => {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [startOptions, setStartOptions] = useState([]);
  const [endOptions, setEndOptions] = useState([]);
  const [waypointOptions, setWaypointOptions] = useState([]);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [optimizedOrder, setOptimizedOrder] = useState([]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY, // Add your API Key here
    libraries,
  });

  const fetchSuggestions = (inputValue, setOptions) => {
    if (!inputValue) {
      setOptions([]);
      return;
    }
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: inputValue }, (predictions) => {
      const options =
        predictions?.map((p) => ({
          value: p.place_id,
          label: p.description,
        })) || [];
      setOptions(options);
    });
  };

  const debouncedFetchStart = debounce(
    (value) => fetchSuggestions(value, setStartOptions),
    300
  );
  const debouncedFetchEnd = debounce(
    (value) => fetchSuggestions(value, setEndOptions),
    300
  );
  const debouncedFetchWaypoints = debounce(
    (value) => fetchSuggestions(value, setWaypointOptions),
    300
  );

  const handleShowPath = async () => {
    if (!start || !end) return;

    const directionsService = new google.maps.DirectionsService();
    const result = await directionsService.route({
      origin: start.label,
      destination: end.label,
      waypoints: waypoints.map((waypoint) => ({
        location: waypoint.label,
        stopover: true,
      })),
      optimizeWaypoints: true, // Optimize waypoints for shortest travel time
      travelMode: google.maps.TravelMode.DRIVING,
    });

    setDirectionsResponse(result);

    // Capture the optimized waypoint order
    if (result.routes[0].waypoint_order) {
      const orderedWaypoints = result.routes[0].waypoint_order.map(
        (index) => waypoints[index]
      );
      setOptimizedOrder([start, ...orderedWaypoints, end]);
    }
  };

  const handleExportToPDF = () => {
    const doc = new jsPDF();

    // Prepare the optimized travel sequence
    const travelSequence = optimizedOrder.length
      ? optimizedOrder
      : [start, ...waypoints, end];
    const tableData = travelSequence.map((location, index) => ({
      label: `Stop ${index + 1}`,
      value: location?.label,
    }));

    doc.text("Travel Plan", 10, 10);
    doc.autoTable({
      head: [["Sequence", "Location"]],
      body: tableData.map((row) => [row.label, row.value]),
    });
    doc.save("travel_plan.pdf");
  };

  useEffect(() => {
    return () => {
      debouncedFetchStart.cancel();
      debouncedFetchEnd.cancel();
      debouncedFetchWaypoints.cancel();
    };
  }, []);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Shorted Path Finder
      </Typography>

      <Box mb={3}>
        <Autocomplete
          options={startOptions}
          getOptionLabel={(option) => option.label}
          onInputChange={(e, value) => debouncedFetchStart(value)}
          onChange={(e, value) => setStart(value)}
          renderInput={(params) => (
            <TextField {...params} label="Start Location" />
          )}
        />
      </Box>

      <Box mb={3}>
        <Autocomplete
          options={endOptions}
          getOptionLabel={(option) => option.label}
          onInputChange={(e, value) => debouncedFetchEnd(value)}
          onChange={(e, value) => setEnd(value)}
          renderInput={(params) => (
            <TextField {...params} label="End Location" />
          )}
        />
      </Box>

      <Box mb={3}>
        <Autocomplete
          multiple
          options={waypointOptions}
          getOptionLabel={(option) => option.label}
          onInputChange={(e, value) => debouncedFetchWaypoints(value)}
          onChange={(e, value) => setWaypoints(value || [])}
          renderInput={(params) => <TextField {...params} label="Waypoints" />}
        />
      </Box>

      <Box mb={3} display="flex" gap={2}>
        <Button variant="contained" color="primary" onClick={handleShowPath}>
          Show Path
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleExportToPDF}
        >
          Export to PDF
        </Button>
      </Box>

      {isLoaded && directionsResponse && (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={{ lat: 20.5937, lng: 78.9629 }}
          zoom={5}
        >
          <DirectionsRenderer directions={directionsResponse} />
        </GoogleMap>
      )}
    </Container>
  );
};

export default App;
