import React, { useEffect, useCallback, useMemo, useState } from "react";
import {
  Grid,
  Box,
  useMediaQuery,
  useTheme,
  Typography,
  Button,
  Divider,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { useParams, useLocation } from "react-router";
import {  Snackbar } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import ProductosCard from "./componentes/ProductosCard";
import Cabezal from "./componentes/Cabezal";

import app from "../Servicios/firebases";

// ✅ Firestore
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
} from "firebase/firestore";

const SUBCOL_PRODUCTOS = "miscompras"; // compradores/{uid}/miscompras/{id}

const DetallesCompra = () => {
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState(null); // compra (compras/{codigo})
  const [serviciosIds, setServiciosIds] = useState([]); // ids (strings) de miscompras/{id}
  const [carddata, setCardData] = useState([]); // productos cargados

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { codigo } = useParams();

  // ✅ Identidad NO por Auth: viene por location.state.userName
  const location = useLocation();
  const userName = (location.state?.userName || "").trim();
  const currentSeller = userName;

  const db = useMemo(() => getFirestore(app), []);

const [copied, setCopied] = useState(false);

const copyAddress = useCallback(async () => {
  if (!data) return;

  const textToCopy = `Chekea Servicios 18171337454 广东东莞市石碣镇崇焕中路111号(马拉博仓库) Ch-${String(
    data.id ?? ""
  ).slice(-5)} - ${data.contacto ?? ""}`;

  try {
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
  } catch (error) {
    console.error("Error copiando dirección:", error);
  }
}, [data]);


  // ============================================================
  // Helpers precio (igual que tenías)
  // ============================================================
  const PRECIO_REAL = useCallback((precioFinal) => {
    const f = Number(precioFinal || 0);
    if (f <= 0) return 0;

    const base1 = (f - 1500) / 1.3;
    if (base1 > 0 && base1 <= 7000) return Math.round(base1);

    const base2 = (f - 1000) / 1.22;
    if (base2 > 7000 && base2 <= 25000) return Math.round(base2);

    const base3 = f / 1.15;
    if (base3 > 25000 && base3 <= 250000) return Math.round(base3);

    const base4 = f / 1.12;
    if (base4 > 250000 && base4 <= 500000) return Math.round(base4);

    const base5 = (f - 100000) / 1.08;
    return Math.round(base5);
  }, []);

  const PRECIO_5_PERCENT = useCallback((precioFinal) => {
    const p = Number(precioFinal || 0);
    return Math.round(p * 0.05);
  }, []);

  // ============================================================
  // Estado/candado compra
  // ============================================================
  const compraEstadoCandado = data?.compraEstado || "Libre"; // Libre | Cogida
  const compraCogidaPor = String(data?.compraCogidaPor || "");
  const esMiaLaCompra = compraEstadoCandado === "Cogida" && compraCogidaPor === currentSeller;

  // Estado global (lo que mandas a TODOS)
  const estadoGlobal = String(data?.Estado || ""); // "" | Comprado | Error | Enviado | Retirado

  const compradorId = String(data?.Usuario || "").trim();

  const idsLimpios = useMemo(() => {
    return Array.isArray(serviciosIds)
      ? serviciosIds.map((x) => String(x).trim()).filter(Boolean)
      : [];
  }, [serviciosIds]);

  // ============================================================
  // 1) Listener compra: compras/{codigo}
  // ============================================================
  useEffect(() => {
    if (!codigo) return;

    setLoading(true);
    const compraRef = doc(db, "compras", String(codigo).trim());

    const unsub = onSnapshot(
      compraRef,
      (snap) => {
        if (!snap.exists()) {
          setData(null);
          setServiciosIds([]);
          setCardData([]);
          setLoading(false);
          return;
        }

        const compra = { id: snap.id, ...snap.data() };
        setData(compra);

        const ids = Array.isArray(compra.Servicios) ? compra.Servicios : [];
        setServiciosIds(ids.map((x) => String(x).trim()).filter(Boolean));

        setLoading(false);
      },
      (err) => {
        console.error("Error escuchando compra:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [db, codigo]);

  // ============================================================
  // 2) Leer productos: compradores/{uid}/miscompras/{prodId}
  // ============================================================
  useEffect(() => {
    const run = async () => {
      if (!compradorId) {
        setCardData([]);
        return;
      }
      if (!idsLimpios.length) {
        setCardData([]);
        return;
      }

      try {
        setCardData([]);

        const promises = idsLimpios.map(async (prodId) => {
          const prodRef = doc(db, "compradores", compradorId, SUBCOL_PRODUCTOS, prodId);
          const prodSnap = await getDoc(prodRef);
          return prodSnap.exists() ? { id: prodSnap.id, ...prodSnap.data() } : null;
        });

        const productos = (await Promise.all(promises)).filter(Boolean);
        setCardData(productos);
      } catch (err) {
        console.error("Error cargando productos:", err);
      }
    };

    run();
  }, [db, compradorId, idsLimpios]);

  // ============================================================
  // Acciones GLOBAL
  // ============================================================

  // ✅ 1) COGER COMPRA (solo candado en compras/{codigo})
  const cogerCompra = useCallback(async () => {
    try {
      if (!codigo) return;
      if (!currentSeller) {
        alert("Falta userName (location.state.userName).");
        return;
      }

      const compraRef = doc(db, "compras", String(codigo).trim());

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(compraRef);
        if (!snap.exists()) throw new Error("Compra no existe.");

        const compra = snap.data() || {};
        const candado = compra.compraEstado || "Libre";

        if (candado !== "Libre") {
          throw new Error("Esta compra ya fue cogida por otra vendedora.");
        }

        tx.update(compraRef, {
          compraEstado: "Cogida",
          compraCogidaPor: currentSeller,
          compraCogidaAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo coger la compra.");
    }
  }, [db, codigo, currentSeller]);

  // ✅ helper: actualiza Estado en compra + todos miscompras (BATCH)
  const setEstadoGlobalBatch = useCallback(
    async (nextEstado) => {
      if (!codigo) return;
      if (!compradorId) {
        alert("Falta data.Usuario (compradorId).");
        return;
      }
      if (!idsLimpios.length) {
        alert("No hay serviciosIds para actualizar.");
        return;
      }

      const compraRef = doc(db, "compras", String(codigo).trim());
      const batch = writeBatch(db);

      // compras/{codigo}
      batch.update(compraRef, { Estado: nextEstado, updatedAt: serverTimestamp() });

      // compradores/{uid}/miscompras/{id} (TODOS)
      for (const prodId of idsLimpios) {
        const prodRef = doc(db, "compradores", compradorId, SUBCOL_PRODUCTOS, prodId);
        batch.update(prodRef, { Estado: nextEstado });
      }

      await batch.commit();

      // UX local (no depende de esto, pero mejora)
      setCardData((prev) => prev.map((p) => ({ ...p, Estado: nextEstado })));
    },
    [db, codigo, compradorId, idsLimpios]
  );

  // ✅ 2) COMPRADO / ERROR (valida candado y dueña, luego set Estado global)
  const marcarComprado = useCallback(async () => {
    try {
      if (!currentSeller) {
        alert("Falta userName (location.state.userName).");
        return;
      }
      if (!codigo) return;

      const compraRef = doc(db, "compras", String(codigo).trim());

      // Validación fuerte en TX (para que nadie cierre si no la cogió)
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(compraRef);
        if (!snap.exists()) throw new Error("Compra no existe.");

        const compra = snap.data() || {};
        const candado = compra.compraEstado || "Libre";
        const cogidaPor = String(compra.compraCogidaPor || "");

        if (candado !== "Cogida") throw new Error("La compra no está cogida.");
        if (cogidaPor !== currentSeller) throw new Error("La compra la cogió otra vendedora.");

        // Solo dejamos una marca de cierre (sin tocar miscompras aquí)
        tx.update(compraRef, { compraCerradaAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      // Actualización global (compra + todos miscompras)
      await setEstadoGlobalBatch("Comprado");
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo marcar Comprado.");
    }
  }, [db, codigo, currentSeller, setEstadoGlobalBatch]);

  const marcarError = useCallback(async () => {
    try {
      if (!currentSeller) {
        alert("Falta userName (location.state.userName).");
        return;
      }
      if (!codigo) return;

      const compraRef = doc(db, "compras", String(codigo).trim());

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(compraRef);
        if (!snap.exists()) throw new Error("Compra no existe.");

        const compra = snap.data() || {};
        const candado = compra.compraEstado || "Libre";
        const cogidaPor = String(compra.compraCogidaPor || "");

        if (candado !== "Cogida") throw new Error("La compra no está cogida.");
        if (cogidaPor !== currentSeller) throw new Error("La compra la cogió otra vendedora.");

        tx.update(compraRef, { compraCerradaAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });

      await setEstadoGlobalBatch("Error");
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo marcar Error.");
    }
  }, [db, codigo, currentSeller, setEstadoGlobalBatch]);

  // ✅ 3) ENVIADO (solo si Estado == Comprado)
  const marcarEnviado = useCallback(async () => {
    try {
      if (!currentSeller) {
        alert("Falta userName (location.state.userName).");
        return;
      }
      if (estadoGlobal !== "Comprado") {
        alert("Solo puedes marcar ENVIADO si la compra está en COMPRADO.");
        return;
      }
      await setEstadoGlobalBatch("Enviado");
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo marcar Enviado.");
    }
  }, [currentSeller, estadoGlobal, setEstadoGlobalBatch]);

  // ✅ 4) RETIRADO (solo si Estado == Enviado) + actualiza a TODOS
  const marcarRetirado = useCallback(async () => {
    try {
      if (!currentSeller) {
        alert("Falta userName (location.state.userName).");
        return;
      }
      if (estadoGlobal !== "Enviado") {
        alert("Solo puedes marcar RETIRADO si la compra está en ENVIADO.");
        return;
      }
      await setEstadoGlobalBatch("Retirado");
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo marcar Retirado.");
    }
  }, [currentSeller, estadoGlobal, setEstadoGlobalBatch]);

  // ============================================================
  // Render
  // ============================================================
  if (loading) {
    return (
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
    );
  }

  const RenderPanelGlobal = () => {
    const disabledNoUser = !currentSeller;

    // Reglas UI global:
    // - Retirado: no botones
    // - Enviado: solo Retirado
    // - Comprado: solo Enviado
    // - Si no está Comprado/Error/Enviado/Retirado:
    //   - Libre: Coger
    //   - Cogida (mía): Comprado + Error
    const esFinal = estadoGlobal === "Retirado";

    return (
      <Box sx={{ p: 2, mt: 2, border: "1px solid #eee", borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Gestión GLOBAL de la compra
        </Typography>

        <Typography variant="caption" sx={{ display: "block", color: "gray" }}>
          Vendedora: {currentSeller || "(sin userName)"} | Candado: {compraEstadoCandado}
          {compraCogidaPor ? ` | CogidaPor: ${compraCogidaPor}` : ""}
          {estadoGlobal ? ` | Estado: ${estadoGlobal}` : ""}
        </Typography>

        {!currentSeller && (
          <Typography variant="body2" sx={{ color: "error.main", mt: 1 }}>
            ⚠️ Falta userName (location.state.userName).
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
          {/* RETIRADO => nada */}
          {esFinal && (
            <Typography variant="body2" sx={{ color: "success.main", mt: 0.5 }}>
              ✅ Finalizado (RETIRADO)
            </Typography>
          )}

          {/* ENVIADO => RETIRADO */}
          {!esFinal && estadoGlobal === "Enviado" && (
            <Button
              variant="contained"
              size="small"
              onClick={marcarRetirado}
              disabled={disabledNoUser}
            >
              RETIRADO
            </Button>
          )}

          {/* COMPRADO => ENVIADO */}
          {!esFinal && estadoGlobal === "Comprado" && (
            <Button
              variant="contained"
              size="small"
              onClick={marcarEnviado}
              disabled={disabledNoUser}
            >
              ENVIADO
            </Button>
          )}

          {/* Error: estado global */}
          {!esFinal && estadoGlobal === "Error" && (
            <Typography variant="body2" sx={{ color: "error.main", mt: 0.5 }}>
              ❌ Compra marcada como ERROR
            </Typography>
          )}

          {/* Si todavía no está en estados finales */}
          {!esFinal &&
            estadoGlobal !== "Comprado" &&
            estadoGlobal !== "Enviado" &&
            estadoGlobal !== "Error" && (
              <>
                {compraEstadoCandado === "Libre" && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={cogerCompra}
                    disabled={disabledNoUser}
                  >
                    COGER COMPRA
                  </Button>
                )}

                {compraEstadoCandado === "Cogida" && esMiaLaCompra && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={marcarComprado}
                      disabled={disabledNoUser}
                    >
                      COMPRADO
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={marcarError}
                      disabled={disabledNoUser}
                    >
                      ERROR
                    </Button>
                  </>
                )}

                {compraEstadoCandado === "Cogida" && !esMiaLaCompra && (
                  <Typography variant="body2" sx={{ color: "warning.main", mt: 0.5 }}>
                    Compra cogida por otra vendedora (bloqueado)
                  </Typography>
                )}
              </>
            )}
        </Box>

        <Divider sx={{ mt: 2 }} />
      </Box>
    );
  };

  return (
    <div style={{ paddingTop: "10px" }}>
      <Grid container>
        {!isMobile ? (
          <>
            <Grid item xs={6}>
              <Box sx={{ p: 1, display: "flex", justifyContent: "center" }}>
               <Grid item xs={10}>
  <h2>{`INFORMACION COMPRA\n\nCodigo: ${data?.Fecha ?? ""}`}</h2>
<Typography variant="body1" sx={{ color: "red" }}>
  ⚠️ IMPORTANTE !!! Copiar la direccion SOLO si va directo a la AGENCIA
</Typography>


  <Typography variant="body1" sx={{  mt: 1 }}>
    Chekea Servicios 18171337454 广东东莞市石碣镇崇焕中路111号(马拉博仓库)
    {" "}Ch-{String(data?.id).slice(-5)} - {data?.contacto}
  </Typography>

  <Button
    variant="outlined"
    size="small"
    startIcon={<ContentCopyIcon />}
    sx={{ mt: 1 }}
    onClick={copyAddress}
    disabled={!data}
  >
    Copiar dirección
  </Button>

  <Snackbar
    open={copied}
    autoHideDuration={2000}
    onClose={() => setCopied(false)}
    message="Dirección copiada"
  />
</Grid>

              </Box>

              {/* <div style={{ display: "flex", marginTop: 10, justifyContent: "center" }}>
                <div style={{ width: "50%", height: "50%" }}>
                  <img
                    src={data?.img}
                    alt="Image"
                    style={{ width: "100%", height: "50%", objectFit: "contain" }}
                  />
                </div>
              </div> */}
            </Grid>

            <Grid item xs={6}>
              <h2>{`${carddata.length} PRODUCTOS`}</h2>
              <Box sx={{ p: 2 }}>
                <RenderPanelGlobal />

                {/* ✅ Global: ProductosCard solo muestra. No ejecuta cambios */}
                <ProductosCard data={carddata} enviado={() => {}} />
              </Box>
            </Grid>
          </>
        ) : (
          <div style={{ width: "100%" }}>
            <Cabezal texto={"Detalles"} />
            <Box sx={{ display: "flex", paddingTop: 5, justifyContent: "center" }}>
              <Grid item xs={10}>
                <RenderPanelGlobal />
                <ProductosCard data={carddata} enviado={() => {}} />
              </Grid>
            </Box>
          </div>
        )}
      </Grid>
    </div>
  );
};

export default DetallesCompra;
