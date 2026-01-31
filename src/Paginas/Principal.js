import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Grid, Typography, Paper, IconButton } from "@mui/material";
import Alert from "./componentes/Alert";
import ImageUploading from "react-images-uploading";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { compressImage } from "../ayuda";
import TensorFlow from "./componentes/TensorFlow";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

const items = [
  { name: "Compras", link: "/Exterior" },
  { name: "Publicados", link: "/Buscar" },
  { name: "Modulo", link: "/Ajustes" },

  { name: "Publicar", link: "/Publicar" },
  { name: "Farmacias", link: "/Farmacias" },
];

const colors = ["#FFCDD2", "#C8E6C9", "#BBDEFB", "#FFECB3"];

const Principal = ({ email, logout }) => {
  const [images, setImages] = useState([]);
  const maxNumber = 1; // Only allow one image
  const [name, setName] = useState(localStorage.getItem("userName") || "");
  const [showPopup, setShowPopup] = useState(!localStorage.getItem("userName"));
  const filteredItems = items.filter((item) => {
    if (showPopup) return false;

    const user = name.trim().toLowerCase();

    // Si es admin → mostrar todos
    if (user === "admin") return true;

    // Si es 01 → mostrar MaisaProd y Publicar
    if (user === "01" || user === "001" || user === "1" || user === "11") {
      return ["Publicados", "Publicar",'Modulo','Compras'].includes(item.name);
    }

    // Si es 001 → mostrar Compras y Exterior

    // Cualquier otro nombre → no mostrar nada
    return false;
  });

  const navigate = useNavigate();
  const dataURLToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };
  // const onChange = (imageList) => {
  //   setImages(imageList);
  // };
  // Handle image compression and uploading
  const onChange = async (imageList) => {
    const compressedFiles = await Promise.all(
      imageList.map(async (image) => {
        // Convert image data URL to a File object or use the image file directly if available
        const file = image.file || dataURLToFile(image.data_url, "image.jpg");
        const compressedFile = await compressImage(file);
        return {
          ...image,
          file: compressedFile,
        };
      })
    );

    // Add the compressed file to the state, ensuring only 1 image is allowed
    if (compressedFiles.length <= maxNumber) {
      setImages(compressedFiles);
    } else {
      alert("You can upload only 1 image.");
    }
  };

  const handleBoxClick = (link) => {
    navigate(link, { state: { userName: name } });
  };

  const [open, setOpen] = useState(false);
  const [mensaje, setmensaje] = useState("Seguro que desea cerrar session");
  const handleOpen = (object) => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleConfirm = () => {
    logout();
  };
  return (
    // <div>
    //   <TensorFlow />
    // </div>

    <>
      <Grid container spacing={2} padding={5}>
        <Dialog open={showPopup} disableEscapeKeyDown>
          <DialogTitle>Ingresa tu nombre</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre"
              type="text"
              fullWidth
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                if (name.trim() === "") {
                  alert("Por favor, escribe un nombre.");
                  return;
                }
                // guardar el nombre en localStorage
                localStorage.setItem("userName", name.trim());
                setShowPopup(false);
              }}
              variant="contained"
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        <Alert
          open={open}
          message={mensaje}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
        {/* <div style={{ position: "fixed", bottom: 20, right: 25 }}>
        <button style={{ padding: 15 }} onClick={() => handleOpen()}>
          Cerrar Sesión
        </button>
      </div> */}
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
              <Typography align="center" fontSize={"1.2rem"}>
                {item.name}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Button
        variant="outlined"
        onClick={() => {
          localStorage.removeItem("userName");
          setName("");
          setShowPopup(true);
        }}
      >
        Cambiar usuario
      </Button>
    </>
  );
};

export default React.memo(Principal);
