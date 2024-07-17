import React from "react";
import { useNavigate } from "react-router-dom";
import { Grid, Typography, Paper } from "@mui/material";

const items = [
  { name: "Compras", link: "/Nacional" },
  { name: "Exterior", link: "/Exterior" },
  { name: "Buscar", link: "/Buscar" },
  { name: "Contabilidad", link: "/Contabilidad" },
  { name: "Publicar", link: "/Publicar" },
  { name: "Otros", link: "/" },
];

const colors = ["#FFCDD2", "#C8E6C9", "#BBDEFB", "#FFECB3"];

const Principal = ({ email, logout }) => {
  const navigate = useNavigate();

  const handleBoxClick = (link) => {
    navigate(link);
  };

  const filteredItems = items.filter((item) => {
    // Adjust the condition based on the email
    if (email === "nawetin@gmail.com") {
      return ["Compras", "Otros"].includes(item.name);
    } else if (email === "chekeagroup@gmail.com") {
      return ["Compras", "Contabilidad", "Otros"].includes(item.name);
    }
    // Default to showing all items if email doesn't match
    return true;
  });

  return (
    <Grid container spacing={2} padding={5}>
      <div style={{ position: "fixed", bottom: 20, right: 25 }}>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to log out?")) {
              logout();
            }
          }}
        >
          Cerrar Sesión {email}
        </button>
      </div>
      {filteredItems.map((item, index) => (
        <Grid item xs={6} sm={6} md={4} lg={3} key={index} display="flex">
          <Paper
            elevation={3}
            onClick={() => handleBoxClick(item.link)}
            style={{
              backgroundColor: colors[index % colors.length],
              padding: "20px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              maxWidth: "100px",
              height: "150px",
              borderRadius: "10px",
            }}
          >
            <Typography variant="h6" align="center">
              {item.name}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default React.memo(Principal);
