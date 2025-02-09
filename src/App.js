/* global google*/
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
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    googleMapsApiKey: API_KEY,
    libraries,
  });


  useEffect(() => {
    const defaultStart = { label: "Akola, Maharashtra, India", value: null };
    setStart(defaultStart);
  }, []);

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
    if (!start) return;

    let destination = end?.label || waypoints[waypoints.length - 1]?.label;

    if (!destination) {
      toast.error("Please select add at least one waypoint.")
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    const waypointsToUse = waypoints.map((waypoint) => ({
      location: waypoint.label,
      stopover: true,
    }));

    const result = await directionsService.route({
      origin: start.label,
      destination: destination,
      waypoints: waypointsToUse,
      optimizeWaypoints: true, // Optimize waypoints for shortest travel time
      travelMode: google.maps.TravelMode.DRIVING,
    });

    setDirectionsResponse(result);

    // Capture the optimized waypoint order
    if (result.routes[0].waypoint_order) {
      toast.success("Path successfully found!");
      const orderedWaypoints = result.routes[0].waypoint_order.map(
        (index) => waypoints[index]
      );
      setOptimizedOrder([start, ...orderedWaypoints, { label: destination }]);
    }
  };
  const handleExportToPDF = () => {
    const doc = new jsPDF();

    // Ensure we use the optimized order if available
    let travelSequence = optimizedOrder.length > 0 ? optimizedOrder : [start, ...waypoints, end];

    // If the user has selected an explicit end location, ensure it's the last entry
    if (end) {
      travelSequence = optimizedOrder.length > 0 ? [...optimizedOrder.slice(0, -1), end] : [start, ...waypoints, end];
    }


    const tableData = travelSequence.map((location, index) => {
      if (index === 0) {
        return { label: "Start Location", value: location?.label || "Akola, Maharashtra, India" };
      } else if (index === travelSequence.length - 1) {
        return { label: "End Location", value: location?.label || "Last Village" };
      } else {
        return { label: `Stop ${index}`, value: location?.label };
      }
    });

    // Generate PDF
    toast.success("PDF Downloaded Successfully!")
    const companyName = "Your Company Name";
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");

  const pageWidth = doc.internal.pageSize.width;
  const headerHeight = 15; // Header height
  const textWidth = doc.getTextWidth(companyName);
  const textX = (pageWidth - textWidth) / 2; // Centered text position
  const textY = 10; // Text vertical position

  // Set header background color (Primary color)
  doc.setFillColor(200, 200, 200); // Blue (RGB: 0, 123, 255)
  doc.rect(0, 0, pageWidth, headerHeight, "F"); // Draw filled rectangle

  // Set text color to white for contrast
  doc.setTextColor(255, 255, 255);
  doc.text(companyName, textX, textY); // Centered text in header

  // Reset text color for the rest of the document
  doc.setTextColor(0, 0, 0);

  // Title under header
  doc.setFontSize(12);
  doc.text("sequenced List", 15, 25);

  // Add Table
  doc.autoTable({
    head: [["Label", "Location"]],
    body: tableData.map((row) => [row.label, row.value]),
    startY: 30, // Start below title
  });

  // FOOTER: Set background and text
  const pageHeight = doc.internal.pageSize.height;
  const footerHeight = 15;

  // Set footer background color (light gray)
  doc.setFillColor(200, 200, 200); // Gray background
  doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, "F");

  // Footer text
  const footerText = "Generated by Shortest Path Finder | © 2025";
  const footerTextWidth = doc.getTextWidth(footerText);
  doc.setTextColor(0, 0, 0); // Black text
  doc.setFontSize(10);
  doc.text(footerText, (pageWidth - footerTextWidth) / 2, pageHeight - 5);

    let filename = `travel_plan_${new Date().toJSON().slice(0, 10)}`;
    doc.save(filename);
  };
  useEffect(() => {
    return () => {
      debouncedFetchStart.cancel();
      debouncedFetchEnd.cancel();
      debouncedFetchWaypoints.cancel();
    };
  }, []);

  return (
    <Container
      sx={{
        background: "aliceblue",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
        // backgroundColor: "rgba(255, 255, 255, 0.6)",
        WebkitBackdropFilter: "blur(10px)",
        color: "white",
      }}
    >
      <ToastContainer position="top-left" autoClose={3000} />
      <Typography variant="h4" gutterBottom color="primary" fontWeight={"bold"} textAlign={"center"}>
        Your Company Name
      </Typography>

      <Box mb={3}>
        <Autocomplete
          options={startOptions}
          getOptionLabel={(option) => option.label}
          onInputChange={(e, value) => debouncedFetchStart(value)}
          onChange={(e, value) => setStart(value)}
          value={start}
          renderInput={(params) => (
            <TextField {...params} label="Start Location" disabled />
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
            <TextField {...params} label="End Location (Optional)" />
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
          renderInput={(params) => <TextField {...params} label="Villages" />}
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
