import React, { useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Chip,
  Input,
  Drawer,
  TextField,
  Typography,
  Button,
  Grid,
  CircularProgress,
  FormControlLabel,
  Switch,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  get,
  ref,
  remove,
  getDatabase,
  push,
  set,
  update,
  onValue,
  query,
  equalTo,
  orderByChild,
} from "firebase/database";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";
import {
  doc,
  collection,
  getDocs,
  onSnapshot,
  getFirestore,
  getDoc,
} from "firebase/firestore";

import app from "./../Servicios/firebases";
import { useNavigate, useParams } from "react-router";
import Cabezal from "./componentes/Cabezal";
import Alert from "./componentes/Alert";

const AlertComponent = ({ isOpen, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState("");

  const handleConfirm = () => {
    if (inputValue < 90) {
      onConfirm(inputValue);
    } else {
      alert("Ha ocurido un error");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Introduzca Descuento</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Descuento en %"
          type="number"
          fullWidth
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};
const EditarPost = () => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [dimension, setDimension] = useState("");
  const [espacio, setEspacio] = useState("");
  const [data, setData] = useState(null);

  const [cantidad, setCantidad] = useState("");
  const [stock, setStock] = useState(false);

  const [ubicacion, setUbicacion] = useState("");
  const [loading, setLoading] = useState(false); // Loading state

  const [details, setDetails] = useState("");
  const [images, setImages] = useState([]);
  const [selectedChip, setSelectedChip] = useState("Aerea");
  const [chipData, setChipData] = useState([]);
  const [showbox, setShowBox] = useState(true);

  const [chipscolor, setChipscolor] = useState([]);
  const [chipscoloradd, setChipscoloradd] = useState([]);

  const [chips, setChips] = useState([]);
  const [chipsnew, setChipsnew] = useState([]);

  const [prices, setPrices] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [inputValues, setInputValues] = useState("");
  const [view, setView] = useState("");
  const database = getDatabase(app);
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { codigo, contexto } = useParams(); // Access the URL parameter
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [tovalue, setToValue] = useState(false);
  const [todelete, setToDelete] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState("color"); // "color" o "talla"
  const [dataChip, setDataChip] = useState(null); // chip que estamos editando
  const [newColor, setNewColor] = useState(""); // título del chip
  const [newPrice, setNewPrice] = useState(""); // precio (solo para talla)

  const navigate = useNavigate();
  const db = getFirestore(app);

  const handleDrawerOpen = (type, chip = null) => {
    setDrawerType(type);
    setDataChip(chip);

    if (chip) {
      // si es un chip de tipo "talla" con precio
      if (type === "talla") {
        setNewColor(chip.label ?? "");
        setNewPrice(chip.price ?? 0);
      } else {
        setNewColor(chip.label ?? "");
        setNewPrice("");
      }
    } else {
      // si vamos a agregar un chip nuevo
      setNewColor("");
      setNewPrice("");
    }

    setDrawerOpen(true);
  };

  const handleDrawerClose = () => setDrawerOpen(false);

  const handleSaveNew = () => {
    if (!newColor) return;

    if (drawerType === "color") {
      if (dataChip) {
        // editar color existente
        setChipscolor((prev) =>
          prev.map((c) => (c === dataChip ? { label: newColor } : c))
        );
      } else {
        // agregar nuevo color
        setChipscolor((prev) => [...prev, { label: newColor }]);
      }
    } else {
      const chipObj = { label: newColor, price: newPrice || 0 };
      if (dataChip) {
        // editar talla existente
        setChips((prev) =>
          prev.map((c) =>
            c.id === dataChip.id
              ? { ...c, label: newColor, precio: newPrice }
              : c
          )
        );
      } else {
        // agregar nueva talla
        setChips((prev) => [...prev, chipObj]);
      }
    }

    // limpiar estados y cerrar Drawer
    setDataChip(null);
    setNewColor("");
    setNewPrice("");
    setDrawerOpen(false);
  };

  console.log(codigo);
  const [number, setNumber] = useState(null);
  const handleOpenAlert = () => {
    setIsAlertOpen(true);
  };

  const handleCloseAlert = () => {
    setIsAlertOpen(false);
  };

  const handleConfirmAlert = (value) => {
    setNumber(value);
    ActualizarDescuento(value);
    console.log("Confirmed value:", value);
  };
  const handleOpen = () => {
    setOpen(true);
  };

  const handleCloses = () => {
    setOpen(false);
  };

  const handleConfirm = () => {
    ValueExistinDb(todelete, tovalue, "Eliminar");
    handleCloses();
  };

  const handleTitleChange = (e) => setTitle(e.target.value);
  const handlePriceChange = (e) => setPrice(e.target.value);
  const handleDimension = (e) => setDimension(e.target.value);
  const handleEspacio = (e) => setEspacio(e.target.value);

  const handleCantidad = (e) => setCantidad(e.target.value);

  const handleUbicacion = (e) => setUbicacion(e.target.value);

  const handleDetailsChange = (e) => setDetails(e.target.value);

  const getCurrentTimeInMilliseconds = () => {
    return Date.now();
  };
  //nuevo abajo

  const lugar = (pais) => {
    // Implement your `lugar` function logic here
    // Example:
    return pais === "Guinea Ecuatorial" ? "Nacional" : "Exterior";
  };
  const ActualizarDescuento = async (dato) => {
    let valor = parseInt(dato);
    let context = lugar(data.Pais);

    const dbRef = ref(database, `GE/${context}/Prod/${codigo}`);

    try {
      // Update the discount value
      console.log(dato, "existe");
      await update(dbRef, { Descuento: valor });

      if (valor > 0) {
        // If valor is not 0, update the Rebajas node
        const rebajasRef = ref(database, `GE/Rebajas/${codigo}`);
        const rebajasRef1 = ref(
          database,
          `GE/Filtros/${context}/${data.Categoria}/${codigo}`
        );
        const rebajasRef2 = ref(database, `GE/${context}/Prod/${codigo}`);

        // await update(rebajasRef, diccionario1);
        await update(rebajasRef1, { Descuento: valor });
      } else {
        // If valor is 0, remove the Rebajas node
        const rebajasRef = ref(database, `GE/Rebajas/${codigo}`);
        const rebajasRef1 = ref(
          database,
          `Filtros/${context}/${data.Categoria}/${codigo}`
        );
        await update(rebajasRef1, { Descuento: valor });

        await remove(rebajasRef);
      }

      console.log("Data updated successfully");

      // Simulate dismissing a loading indicator and enabling user interaction
      // Implement your actual UI update logic here
      // For example, using React state:
      // setLoading(false);
      // setUserInteractionEnabled(true);
    } catch (error) {
      console.error("Error updating data: ", error);
    }
  };

  //nuevo arriba
  const handleInputChange = (e) => setInputValue(e.target.value);
  const handleInputChangeStilo = (e) => setInputValues(e.target.value);

  const handleAddChip = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        setChipscolor([...chipscolor, inputValue.trim()]);

        setInputValue("");
      }
    }
  };
  const handleAddChips = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      console.log(inputValues, "k es");
      if (inputValues.trim()) {
        setChipsnew([...chipsnew, inputValues.trim()]);
        setPrices({ ...prices, [inputValues.trim()]: "" });

        console.log("wetiin", prices);
        setInputValues("");
      }
    }
  };

  const handleDeleteChip = (chipToDelete) => {
    setToDelete(chipToDelete);
    setToValue("Color");
    setOpen(true);

    setChipscolor(chipscolor.filter((chip) => chip !== chipToDelete));
  };

  const handleChipClick = (chipValue) => {
    console.log(chipValue);
    if (chipValue !== selectedChip) {
      setSelectedChip(chipValue);

      // fetchData(chipValue);
    }
  };

  const handleDeleteChips = (chipToDelete) => {
    setOpen(true);
    const parts = chipToDelete.split(":");
    setToDelete(parts[0]);
    setToValue("Talla");
    setChips(chips.filter((chip) => chip !== chipToDelete));
  };
  const handleDeleteChips2 = (chipToDelete) => {
    console.log("wettin");
    setChipsnew(chipsnew.filter((chip) => chip !== chipToDelete));
    const updatedPrices = { ...prices };
    delete updatedPrices[chipToDelete];
    setPrices(updatedPrices);
  };

  const handlePriceChanges = (e, chipName) => {
    setPrices({ ...prices, [chipName]: e.target.value });
  };
  const handleButtonClick = (view) => {
    setShowBox(false);
    setView(view);
    // Perform any additional actions based on the selected view
    console.log(`Selected view: ${view}`);
  };
  const chipOptions1 = [
    { label: "Aerea", value: "Aerea" },
    { label: "Maritima", value: "Maritima" },
  ];

  useEffect(() => {
    const fetchData = async (codigo) => {
      try {
        // 1) Referencia al documento producto
        const productRef = doc(db, "productos", codigo);

        // 2) Leer el documento (getDoc)
        const docSnap = await getDoc(productRef);

        if (!docSnap.exists()) {
          console.log("❌ No existe el documento del producto:", codigo);
          // limpiar estados si hace falta
          setData(null);
          setChips([]);
          setChipscolor([]);
          return;
        }

        const productData = docSnap.data();
        setData(productData);

        // actualizar campos principales (comprueba nombres exactos en Firestore)
        setTitle(productData.Titulo ?? "");
        setUbicacion(productData.Ubicacion ?? "");
        setPrice(productData.Precio ?? "");
        setDetails(productData.Detalles ?? "");
        setStock(productData.Stock ?? "");

        console.log("Producto Data:", productData);

        // 3) Leer subcolecciones en paralelo (más rápido)
        const coloresRef = collection(db, "productos", codigo, "colores");
        const tallasRef = collection(db, "productos", codigo, "tallas");

        const [coloresSnap, tallasSnap] = await Promise.all([
          getDocs(coloresRef),
          getDocs(tallasRef),
        ]);

        // 4) Mapear colores (asegurarse de que label existe)
        const colores = coloresSnap.docs.map((doc) => doc.data());
        // 5) Mapear tallas
        const tallas = tallasSnap.docs.map((doc) => doc.data());

        console.log("Colores:", colores);

        setChipscolor(colores ? colores : []);
        setChips(tallas ? tallas : []);
      } catch (error) {
        console.error("❌ Error al obtener datos:", error);
      }
    };

    fetchData(codigo);

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      // Unsubscribe from database
    };
  }, []);
  const handleToggleChange = (event) => {
    setStock(event.target.checked);
  };
  const ValueExistinDb = async (colorCode, value, value2) => {
    const databaseRef = query(
      ref(database, `GE/${contexto}/Prod/${codigo}/${value}`),
      orderByChild("label"),
      equalTo(colorCode)
    );
    if (value2 === "Eliminar") {
      const snapshot = await get(databaseRef);

      if (snapshot.exists()) {
        let data;
        let key;
        snapshot.forEach((childSnapshot) => {
          key = childSnapshot.key;
        });
        console.log("Key:", key);

        // Delete the node
        const nodeRef = ref(
          database,
          `GE/${contexto}/Prod/${codigo}/${value}/${key}`
        );
        await remove(nodeRef);
        console.log("Node deleted successfully.");
      }
    } else {
      try {
        const snapshot = await get(databaseRef);
        if (!snapshot.exists()) {
          console.log("ENTRAMOS", colorCode, value);
          pushColorToDatabase(colorCode, value);
        }
      } catch (error) {
        console.error("Error checking value existence in the database:", error);
        return false;
      }
    }
  };
  const pushColorToDatabase = async (nodeData, value) => {
    let pais = lugar(data.Pais);
    const colorRefKey = push(
      ref(database, `GE/${pais}/Prod/${codigo}/${value}`)
    ).key;
    const colorPath = `GE/${pais}/Prod/${codigo}/${value}/${colorRefKey}`;
    if (value === "Color") {
      await set(ref(database, colorPath), {
        label: nodeData,
        codigo: colorRefKey,
      });
      console.log({
        label: nodeData,
        codigo: colorRefKey,
      });
    } else {
      console.log({
        label: nodeData,
        precio: parseInt(prices[nodeData] === "" ? price : prices[nodeData]),
        codigo: colorRefKey,
      });
      const priceToSet = parseInt(
        prices[nodeData] === "" ? price : prices[nodeData],
        10
      );

      await set(ref(database, colorRefKey), {
        label: nodeData,
        precio: priceToSet,
        codigo: colorRefKey,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // setLoading(true); // Start loading
    //CUando toca eliminar agregar se guardan los nombres y se hace un map iterando todo
    // para asi conseguir codigo
    //verificar el error en tallas
    const updatedObject = {
      ...data,
      Titulo: title,
      Ubicacion: ubicacion,
      Precio: parseFloat(price),
      Cantidad: parseInt(cantidad),

      Detalles: details,
      Stock: contexto === "Nacional" ? stock : data.Stock,
      Espacio: contexto === "Exterior" ? parseFloat(espacio) : 0,
      Dimension:
        dimension !== undefined ? parseFloat(dimension) : parseFloat(1.5),
    };
    const databaseRef = ref(database, `GE/${contexto}/Prod/${codigo}`);
    const databaseRef2 = ref(
      database,
      `GE/Filtros/${contexto}/${data.Categoria}/${codigo}`
    );

    // try {
    // //   // Update the node
    await update(databaseRef, updatedObject);
    await update(databaseRef2, updatedObject);

    for (const color of chipscolor) {
      ValueExistinDb(color, "Color", "");
      // console.log(color);
    }

    // Add prices to the updates
    for (const chip in prices) {
      if (prices.hasOwnProperty(chip)) {
        // console.log(chip);
        ValueExistinDb(chip, "Talla", "");
      }
    }
    // //   console.log("Data updated successfully");
    // } catch (error) {
    //   console.error("Error updating data: ", error);

    console.log(updatedObject.Categoria, data);
  };

  const handleEdit = () => {
    console.log("wetiin");
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, padding: 2 }}>
      <Cabezal texto={"Editar"} />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          marginTop: isMobile ? 40 : 0,
        }}
      >
        <Button variant="contained" color="info" onClick={handleOpenAlert}>
          APLICAR DESCUENTO
        </Button>
      </div>

      <div style={{ margin: 10 }}>
        <Typography variant="subtitle1" gutterBottom>
          Colores
        </Typography>
        {chipscolor.map((chip, index) => (
          <Chip
            key={index}
            label={chip.label}
            style={{ margin: 3 }}
            onClick={() => handleDrawerOpen("color", chip)}
            onDelete={() => handleDeleteChip(chip)}
          />
        ))}
        <IconButton color="primary" onClick={() => handleDrawerOpen("color")}>
          <AddIcon />
        </IconButton>
      </div>
      <div style={{ margin: 10 }}>
        <Typography variant="subtitle1" gutterBottom>
          Tallas
        </Typography>
        {chips.map((chip, index) => (
          <Chip
            label={`${chip.label} : $${chip.precio}`}
            style={{ margin: 3 }}
            onClick={() => handleDrawerOpen("talla", chip)}
            onDelete={() => handleDeleteChips(chip)}
          />
        ))}
        <IconButton color="primary" onClick={() => handleDrawerOpen("talla")}>
          <AddIcon />
        </IconButton>
      </div>
      {chipsnew.map((chip, index) => (
        <Box
          key={index}
          display="flex"
          alignItems="center"
          marginY={isMobile ? 1 : 5}
        >
          <Chip
            label={chip}
            style={{ margin: 3 }}
            onDelete={() => handleDeleteChips2(chip)}
          />
        </Box>
      ))}

      <Grid container spacing={2} marginTop={isMobile ? 5 : 0}>
        <Grid item xs={12}>
          <TextField
            label="Title"
            variant="outlined"
            value={title}
            onChange={handleTitleChange}
            required
            fullWidth
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Price"
            variant="outlined"
            type="number"
            value={price}
            onChange={handlePriceChange}
            required
            fullWidth
          />
        </Grid>
        {contexto === "Nacional" && (
          <Box display="flex" alignItems="flex-end" marginY={1} margin={1}>
            <TextField
              label="Cantidad"
              type="number"
              value={cantidad}
              onChange={handleCantidad}
              style={{ marginLeft: "8px" }}
            />
            <div style={{ margin: 10, marginLeft: 30 }}>
              <FormControlLabel
                control={
                  <Switch checked={stock} onChange={handleToggleChange} />
                }
                label="Stock"
              />
            </div>
          </Box>
        )}

        <Grid item xs={12}>
          <TextField
            label="Details"
            variant="outlined"
            multiline
            rows={4}
            value={details}
            onChange={handleDetailsChange}
            required
            fullWidth
          />
        </Grid>

        <div
          style={{
            display: "flex",
            alignContent: "center",
            alignItems: "center",
          }}
        >
          <Button type="submit" variant="contained" color="primary">
            {loading ? (
              <CircularProgress color="warning" size={24} />
            ) : (
              "PUBLICAR"
            )}
          </Button>
        </div>
      </Grid>
      {number && <p>Entered number: {number}</p>}
      <AlertComponent
        isOpen={isAlertOpen}
        onClose={handleCloseAlert}
        onConfirm={handleConfirmAlert}
      />
      <Alert
        open={open}
        message={"Seguro que desea borrar este valor?"}
        onClose={handleCloses}
        onConfirm={handleConfirm}
      />
      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerClose}>
        <Box sx={{ width: 300, padding: 2 }}>
          <Typography variant="h6" gutterBottom>
            {drawerType === "color" ? "Nuevo Color" : "Nueva Talla"}
          </Typography>

          {/* Siempre habilitado */}
          <TextField
            label={drawerType === "color" ? "Color" : "Talla"}
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            fullWidth
            margin="normal"
          />

          {/* Solo habilitado si es tipo con precio */}
          {drawerType === "talla" && (
            <TextField
              label="Precio"
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              fullWidth
              margin="normal"
            />
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveNew}
            sx={{ mt: 2 }}
            fullWidth
          >
            Guardar
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default EditarPost;
