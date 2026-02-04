import { Box, Button, Grid, Dialog, Typography } from "@mui/material";
import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router";

function ProductosCard({ data, enviado, isBuscar }) {
  const [open, setOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const passToParent = (item) => {
    if (item.Estado === "Enviado") {
      enviado(item, "Retirado");
    } else {
      enviado(item, "Enviado");
    }
  };

  const navigate = useNavigate();
  const PRECIO_5_PERCENT = useCallback((precioFinal) => {
    const p = Number(precioFinal || 0);
    return Math.round(p * 0.05);
  }, []);
   const PRECIO_REAL = useCallback((precioFinal) => {
    const f = Number(precioFinal || 0);
    if (f <= 0) return 0;
  
    // Tramo 1: base <= 7000
    // final = base * 1.3 + 1500
    // => base = (final - 1500) / 1.3
    const base1 = (f - 1500) / 1.3;
    if (base1 > 0 && base1 <= 7000) return Math.round(base1);
  
    // Tramo 2: base <= 25000
    // final = base * 1.22 + 1000
    const base2 = (f - 1000) / 1.22;
    if (base2 > 7000 && base2 <= 25000) return Math.round(base2);
  
    // Tramo 3: base <= 250000
    // final = base * 1.15
    const base3 = f / 1.15;
    if (base3 > 25000 && base3 <= 250000) return Math.round(base3);
  
    // Tramo 4: base <= 500000
    // final = base * 1.12
    const base4 = f / 1.12;
    if (base4 > 250000 && base4 <= 500000) return Math.round(base4);
  
    // Tramo 5: > 500000
    // final = base * 1.08 + 100000
    const base5 = (f - 100000) / 1.08;
    return Math.round(base5);
  }, []);

  const handleClickProd = (item) => {
    if (isBuscar) {
      let contexto =
        item.Pais !== "Guinea Ecuatorial" ? "Exterior" : "Nacional";
      navigate(`/Buscar/Editar/${item.Codigo}/${contexto}`);
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedImage(null);
  };

  console.log(data);
  return (
    <>
      {data.map((item, index) => (
        <Grid container justifyContent="center" key={index}>
          <Grid item xs={12} sm={10}>
           <Box
                display="flex"
                alignItems="center"
                p={1}
                borderRadius={8}
                boxShadow={3}
                width="100%" // Set width to 100%
              >
                <img
                  src={item.Img}
                  alt="Sample"
                  style={{
                    borderRadius: "30%",
                    width: "100%",
                    maxWidth: "80px",
                    marginRight: "16px",
                  }}
                  onClick={() => handleImageClick(item.Imagen)}
                />
                <div>
                  <h3>{item.Titulo}</h3>
                  <p>{item.Detalles}</p>
                                    <p>Precio de compra: {PRECIO_REAL(item.Precio)} *  Cantidad {item.qty} </p>
                                   <p>Beneficio: {PRECIO_5_PERCENT(item.Precio)}  </p>
    
 <Typography
      variant="body1"
      component="a"
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        color: "primary.main",
        textDecoration: "underline",
        cursor: "pointer",
      }}
    >
     Pulsa aqui
    </Typography>
                </div>
                 
              </Box>
          </Grid>
        </Grid>
      ))}
      <Dialog open={open} onClose={handleClose} maxWidth="lg">
        <div style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}>
          <img
            src={selectedImage}
            alt="Enlarged Sample"
            style={{ width: "100%" }}
          />
        </div>
      </Dialog>
    </>
  );
}

export default ProductosCard;
