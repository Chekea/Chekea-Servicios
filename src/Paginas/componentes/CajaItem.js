import { useTheme } from "@emotion/react";
import { Box, Typography, createTheme, useMediaQuery } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { extract } from "../../ayuda";

function CajaItem({ dats, valor,userName }) {
  const navigate = useNavigate();
  const theme = createTheme(); // Create a theme instance
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [data, setData] = useState(dats);

  const handleClick = (codigo) => {
navigate(`/${valor}/Detalles/${codigo}`, {
  state: { userName },
});
    

    // Navigate to the details page with codigo and context as URL parameters
  };

  console.log(dats);
  return dats?.map((item) => (
    <Box
      onClick={() => handleClick(item.id)}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: !isMobile ? "#f0f0f0" : "none",
        },
        padding: "8px",
        borderRadius: "4px",
        width: "80vw", // Set width to 100% to adjust to screen size
        flexGrow: 1, // Allow the Box to grow to fill available space
        flexShrink: 1, // Allow the Box to shrink if necessary
        overflowX: "hidden", // Hide overflow to prevent horizontal scrolling

        maxWidth: isMobile ? "100%" : "90vw", // Conditionally set maxWidth based on screen size
      }}
      key={item.Codigo}
    >
      <Typography>{item.id}</Typography>
        <Typography color={item.Estado !== "Retirado" ? "red" : null}>
          {item.Estado}
        </Typography>
    </Box>
  ));
}

export default CajaItem;
