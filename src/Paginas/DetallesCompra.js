import React, { useState, useEffect } from "react";
import {
  Grid,
  Box,
  useMediaQuery,
  useTheme,
  Typography,
  Button,
} from "@mui/material";
import ProductosCard from "./componentes/ProductosCard";
import { useNavigate, useParams } from "react-router";
import { getDatabase, ref, onValue, get } from "firebase/database";
import CircularProgress from "@mui/material/CircularProgress";
import app from "../Servicios/firebases";
import Alert from "./componentes/Alert";
import {
  RemoveVaue,
  RemoveVaueDB,
  UpdateDb,
  WriteDb,
  WriteDbPush,
  sendNotif,
} from "../Servicios/DBservices";
import { extract, sendNotification } from "../ayuda";
import { CopyToClipboard } from "react-copy-to-clipboard";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Cabezal from "./componentes/Cabezal";
import axios from "axios";

const DetallesCompra = () => {
  const [loading, setLoading] = useState(true);
  const [enviado, setEnviado] = useState("");
  const [mensaje, setmensaje] = useState(
    "Seguro que ya se envio ese producto?"
  );

  const [data, setData] = useState(true);
  const [userData, setUserData] = useState([]);
  const [object, setobject] = useState(null);

  const [carddata, setcarddata] = useState([]);

  const [extractedData, setExtractedProductos] = useState(null);
  const theme = useTheme();
  const database = getDatabase(app);

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { codigo, contexto } = useParams(); // Access the URL parameter
  const [open, setOpen] = useState(false);

  const sendWhatsAppMessage = () => {
    const phoneNumber = `+8613212074721`; // Replace with the target phone number
    const message = `Buenas, se necesita verificacion para que Chekea envie su compra ${data.CompraId} , basta con responder con un OK`; // Replace with your message
    const appUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
      message
    )}`;

    // Function to detect if the user is on a mobile device
    const isMobileDevice = () => {
      return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    };

    if (isMobileDevice()) {
      // Create a temporary link to test the app URL scheme
      const tempLink = document.createElement("a");
      tempLink.href = appUrl;
      tempLink.style.display = "none";
      document.body.appendChild(tempLink);

      // Attempt to open the WhatsApp app
      tempLink.click();

      // Remove the temporary link
      setTimeout(() => {
        document.body.removeChild(tempLink);
      }, 500);
    } else {
      alert("Please use a mobile device to send the WhatsApp message.");
    }
  };

  // Example button to trigger the function
  <button onClick={sendWhatsAppMessage}>Send WhatsApp Message</button>;

  const receiveForChild = (object, botton) => {
    // checkear el estado si ya se envio o no
    setOpen(true);
    setEnviado(botton);
    if (botton === "Enviado") {
      setobject({
        ...object,
        Estado: "Enviado", // Update the value of Estado field
        Envio: new Date().getTime(),
      });
    } else {
      setmensaje(
        `Seguro que el producto de codigo ${extract(
          String(data.CompraId)
        )} ya fue retirado?\n\n PORFAVOR ASEGURESE!!!`
      );

      setobject({
        ...object,
        Estado: "Retirado", // Update the value of Estado field
        Retiro: new Date().getTime(),
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirm = async () => {
    // Handle confirm action
    const { token } = await sendNotif(`GE/Token/${data.Comprador}`);
    console.log("Estado final en el componente:", object, data);

    const { Compras } = await sendNotif(`GE/Exterior/Prod/${object.Producto}`);

    console.log(token, Compras, "hola");

    switch (enviado) {
      case "Enviado":
        RemoveVaueDB(
          `GE/Comprador/${data.Comprador}/MisCompras/Verificando/${object.Codigo}`
        )
          .then(() => {
            WriteDb(
              object,
              `GE/Comprador/${data.Comprador}/MisCompras/Enviado/${object.Codigo}`
            ).then(() => {
              UpdateDb(
                { Estado: "Enviado" },
                `GE/Compras/${object.contexto}/${codigo}`
              );
              UpdateDb(
                { Compras: Compras + 1 },
                `GE/Exterior/Prod/${object.Producto}/`
              );
              // enviar datas al nodo y hacer listening in cservices
              fetchNotification(
                token,
                "Producto Enviado",
                "Producto ha sido enviado satisfactoriamente"
              );
            });
          })
          .catch((error) => {
            console.error("Error deleting node:", error);
            // Handle error situation here
          });
        break;
      case "Comprado":
        UpdateDb(
          { Estado: "Comprado" },
          `GE/Comprador/${data.Comprador}/MisCompras/Verificando/${object.Codigo}`
        ).then(() => {
          UpdateDb({ Estado: "Comprado" }, `GE/Compras/Exterior/${codigo}`);

          fetchNotification(
            token,
            "Producto Comprado",
            "Producto a esperas de ser enviado"
          );
        });

        break;
      case "Error":
        RemoveVaueDB(
          `GE/Comprador/${data.Comprador}/MisCompras/Verificando/${object.Codigo}`
        )
          .then(() => {
            WriteDb(
              object,
              `GE/Comprador/${data.Comprador}/MisCompras/Error/${object.Codigo}`
            ).then(() => {
              UpdateDb({ Estado: "Error" }, `GE/Compras/Exterior/${codigo}`);
              // enviar datos al nodo y hacer listening in cservices
              fetchNotification(
                token,
                "Error de Compra",
                "Contacte a atencion al cliente"
              );
            });
          })
          .catch((error) => {
            console.error("Error deleting node:", error);
            // Handle error situation here
          });
        break;
      case "Retirado":
        RemoveVaueDB(
          `GE/Comprador/${data.Comprador}/MisCompras/Enviado/${object.Codigo}`
        )
          .then(() => {
            WriteDb(
              object,
              `GE/Comprador/${data.Comprador}/MisCompras/Retirado/${object.Codigo}`
            );
            UpdateDb(
              { Estado: "Retirado" },
              `GE/Compras/${object.contexto}/${codigo}`
            );
          })
          .catch((error) => {
            console.error("Error deleting node:", error);
            // Handle error situation here
          });
        break;
      default:
        console.log("ninguno");
        break;
    }

    handleClose();
  };

  const fetchNotification = async (tokens, tittles, texts) => {
    try {
      const { Servidor } = await sendNotif(`GE/Info`);

      const response = await axios.get(`${Servidor}/notification`, {
        params: {
          token: tokens,
          titulo: tittles,
          texto: texts,
        },
      });

      console.log("Response:", response.data);
    } catch (error) {
      console.error("Error fetching notification:", error);
    }
  };

  const handleObjecto = (obj, valor) => {
    setEnviado(valor);

    // Crear un nuevo objeto basado en el valor recibido
    let newObject = { ...obj, Estado: valor };

    if (valor === "Enviado") {
      newObject.Envio = new Date().getTime();
    } else if (valor === "Retirado") {
      newObject.Retiro = new Date().getTime();
    }

    // Establecer el estado asegurando la actualización
    setobject((prevObj) => ({
      ...prevObj,
      ...newObject,
    }));

    // Mensaje según el estado
    let mensaje = `Seguro que el producto de código ${extract(
      String(data.CompraId)
    )} ya fue ${valor.toLowerCase()}?\n\n POR FAVOR ASEGÚRESE!!!`;

    setmensaje(mensaje);

    // Esperar a que el estado se actualice antes de imprimir
    setTimeout(() => {
      console.log("Estado actualizado:", newObject);
    }, 100);
  };

  // Escuchar cambios en el objeto para verificar la actualización
  useEffect(() => {
    console.log("Estado final en el componente:", object, data);
  }, [object]);

  const handleCompra = (valor) => {
    setOpen(true);

    // carddata.forEach((producto) => {
    //   handleObjecto(producto, valor);

    //   // const id = producto.id;
    //   // const vendedor = data.Comprador;
    //   // fetchData(vendedor, id);
    // });
  };
  console.log(data.Imagen, "hay o no");

  useEffect(() => {
    let da = [];
    const fetchData = () => {
      setLoading(true); // Set loading state to true when fetching data

      const databaseRef = ref(database, `GE/Compras/${contexto}/${codigo}`);
      onValue(databaseRef, (snapshot) => {
        setData(snapshot.val());
        const productosArray = Object.values(snapshot.val().Productos);

        setUserData(productosArray);
        setLoading(false); // Set loading state to true when fetching data
      });
    };

    fetchData();

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      // Unsubscribe from database
    };
  }, []); // Empty dependency array means this effect runs once after the component mounts

  const [hasFetchedData, setHasFetchedData] = useState(false);

  useEffect(() => {
    if (!hasFetchedData && userData.length !== 0) {
      const fetchData = (vendedor, codigo) => {
        console.log(data.Estado, "entar");
        let valor =
          data.Estado === "Comprado" || data.Estado === "Verificando..."
            ? "Verificando"
            : data.Estado;
        const databaseRef = ref(
          database,
          `GE/Comprador/${vendedor}/MisCompras/${valor}/${codigo}`
        );
        get(databaseRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              console.log(snapshot.val(), "hold man");
              setcarddata((prevData) => [...prevData, snapshot.val()]);
              console.log(snapshot.val());
              setHasFetchedData(true);
            } else {
              console.log("No data available");
            }
          })
          .catch((error) => {
            console.error("Error fetching data:", error);
          });
      };

      userData.forEach((producto) => {
        const id = producto.id;
        const vendedor = data.Comprador;
        fetchData(vendedor, id);
      });

      // Update the state variable to indicate that data has been fetched
    }

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      // Unsubscribe from database
    };
  }, [userData, hasFetchedData]);
  const [textToCopy, setTextToCopy] = useState(""); // The text you want to copy
  const [copyStatus, setCopyStatus] = useState(false); // To indicate if the text was copied
  const navigate = useNavigate();
  const handleBackClick = () => {
    navigate(-1); // Go back to the previous page
  };
  const onCopyText = () => {
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000); // Reset status after 2 seconds
  };
  return (
    <div>
      {!loading ? (
        <div style={{ paddingTop: "10px" }}>
          <Alert
            open={open}
            message={mensaje}
            onClose={handleClose}
            onConfirm={handleConfirm}
          />

          <Grid container>
            {!isMobile ? (
              // Horizontal layout for desktop
              <>
                <Grid item xs={6}>
                  <h2>{`INFORMACION COMPRA\n\nCodigo:${data.CompraId} `}</h2>

                  <Box
                    sx={{
                      p: 1,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                       
                        
                        
                         

                        <Typography variant="body1" sx={{ color: "gray" }}>
                          Beneficio
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        
                         

                        <Typography variant="body1">
                        (5%) = 1000 xfas
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {data.Imagen !== null ? (
                    <div
                      style={{
                        display: "flex",
                        marginTop: "10px",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ width: "50%", height: "50%" }}>
                        <img
                          src={data?.Imagen}
                          alt="Image"
                          style={{
                            width: "100%",
                            height: "50%",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {data.Contexto === "Exterior" ? (
                    data.Estado === "Verificando..." ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: "10px",
                          marginTop: "10px",
                        }}
                      >
                         <Button
                          onClick={() => handleCompra("Comprado")}
                          variant="contained"
                          color='success'
                          style={{ borderRadius: "20px", marginRight: "14px" }}
                        >
                          RECIBIDO 
                        </Button>
                        <Button
                          onClick={() => handleCompra("Comprado")}
                          variant="contained"
                          color="primary"
                          style={{ borderRadius: "20px", marginRight: "14px" }}
                        >
                          Comprado
                        </Button>
                        <Button
                          onClick={() => handleCompra("Error")}
                          variant="contained"
                          color="error"
                          style={{ borderRadius: "10px", marginRight: "14px" }}
                        >
                          Error
                        </Button>
                      </div>
                    ) : data.Estado === "Comprado" ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: "10px",
                          marginTop: "10px",
                        }}
                      >
                        <Button
                          onClick={() => handleCompra("Enviado")}
                          variant="contained"
                          color="primary"
                          style={{ borderRadius: "20px", marginRight: "14px" }}
                        >
                          Enviado
                        </Button>
                      </div>
                    ) : data.Estado === "Enviado" ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: "10px",
                          marginTop: "10px",
                        }}
                      >
                        <Button
                          onClick={() => handleCompra("Retirado")}
                          variant="contained"
                          color="primary"
                          style={{ borderRadius: "20px", marginRight: "14px" }}
                        >
                          Retirado
                        </Button>
                      </div>
                    ) : null
                  ) : null}
                </Grid>
                {enviado === "" ? (
                  <Grid item xs={6}>
                    <h2>{`${carddata.length} PRODUCTOS COMPRADOS `}</h2>

                    <Box
                      sx={{
                        p: 2,

                        flexDirection: "row",
                      }}
                    >
                      <ProductosCard
                        data={carddata}
                        enviado={receiveForChild}
                      />
                    </Box>
                  </Grid>
                ) : null}
              </>
            ) : (
              // Vertical layout for mobile
              <div>
                <Cabezal texto={"Detalles"} />

                <Box
                  sx={{
                    display: "flex",
                    paddingTop: 5,
                    justifyContent: "center",
                  }}
                >
                  <Grid item xs={10}>
                    <h2>{`INFORMACION COMPRA \n\nCodigo:${data.CompraId} `}</h2>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body1" sx={{ color: "gray" }}>
                          Nombre
                        </Typography>
                        <Typography variant="body1" sx={{ color: "gray" }}>
                          Barrio
                        </Typography>
                        <Typography variant="body1" sx={{ color: "gray" }}>
                          Contacto
                        </Typography>
                        <Typography variant="body1" sx={{ color: "gray" }}>
                          Lugar de Retiro
                        </Typography>

                        <Typography variant="body1" sx={{ color: "gray" }}>
                          Beneficio
                        </Typography>
                        
                      </Grid>
                      <Grid item xs={6}>
                      
                        <Typography variant="body1">
                          <Typography variant="body1">
                        (5%) = 1000 xfas
                        </Typography>
                        
                        </Typography>
                      </Grid>
                    </Grid>
                    <ProductosCard data={carddata} enviado={receiveForChild} />
                  </Grid>
                </Box>
              </div>
            )}
          </Grid>

          {isMobile ? (
            <div>
              {data.Imagen !== null ? (
                <div
                  style={{
                    display: "flex",
                    marginTop: "10px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div style={{ width: "50%", height: "50%" }}>
                    <img
                      src={data.Imagen}
                      alt="Image"
                      style={{
                        width: "100%",
                        height: "50%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {data.Contexto === "Exterior" ? (
                data.Estado === "Verificando..." ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <Button
                      onClick={() => handleCompra("Comprado")}
                      variant="contained"
                      color="primary"
                      style={{ borderRadius: "20px", marginRight: "14px" }}
                    >
                      Comprado
                    </Button>
                    <Button
                      onClick={() => handleCompra("Error")}
                      variant="contained"
                      color="error"
                      style={{ borderRadius: "10px", marginRight: "14px" }}
                    >
                      Error
                    </Button>
                  </div>
                ) : data.Estado === "Comprado" ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <Button
                      onClick={() => handleCompra("Enviado")}
                      variant="contained"
                      color="primary"
                      style={{ borderRadius: "20px", marginRight: "14px" }}
                    >
                      Enviado
                    </Button>
                  </div>
                ) : data.Estado === "Enviado" ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <Button
                      onClick={() => handleCompra("Retirado")}
                      variant="contained"
                      color="primary"
                      style={{ borderRadius: "20px", marginRight: "14px" }}
                    >
                      Retirado
                    </Button>
                  </div>
                ) : null
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <CircularProgress />
        </div>
      )}
      {data.Contexto === "Nacional" && (
        <button onClick={sendWhatsAppMessage}>CONFIRMAR COMPRA </button>
      )}
    </div>
  );
};

export default DetallesCompra;
