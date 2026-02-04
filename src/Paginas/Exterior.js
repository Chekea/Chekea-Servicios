import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import CajaItem from "./componentes/CajaItem";
import Cabezal from "./componentes/Cabezal";

import { useMediaQuery, useTheme } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";

import app from "./../Servicios/firebases";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

// ✅ Recibir state al navegar
import { useLocation } from "react-router"; // <-- (si tu proyecto usa react-router-dom, cámbialo a "react-router-dom")

const MemoizedCajaItem = memo(CajaItem);

/**
 * ✅ Cache a nivel módulo
 */
let exteriorCache = {
  data: null,
  firstId: null,
  lastFetchAt: null,
};

function Exterior() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const db = useMemo(() => getFirestore(app), []);

  // ✅ RECIBIR userName desde navigation state
  const location = useLocation();
  const userName = location.state?.userName || "";

  const [data, setData] = useState(() => exteriorCache.data ?? []);
  const [loading, setLoading] = useState(false);
  const [hasNews, setHasNews] = useState(false);

  const ORDER_FIELD = "Fecha";

  const fetchLast10 = useCallback(async () => {
    try {
      setLoading(true);

      const comprasRef = collection(db, "compras");
      const q = query(comprasRef, orderBy(ORDER_FIELD, "desc"), limit(10));

      const snap = await getDocs(q);
      const fresh = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const newFirstId = fresh[0]?.id ?? null;

      const changed = Boolean(
        exteriorCache.firstId && newFirstId && newFirstId !== exteriorCache.firstId
      );
      setHasNews(changed);

      exteriorCache = {
        data: fresh,
        firstId: newFirstId,
        lastFetchAt: Date.now(),
      };

      setData(fresh);
    } catch (err) {
      console.error("Error fetching Compras/Exterior:", err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (exteriorCache.data?.length) {
      setData(exteriorCache.data);
    }
  }, []);

  const showInitialSpinner = loading && data.length === 0;
  const isEmpty = !loading && Array.isArray(data) && data.length === 0;

  return (
    <div style={{ marginTop: isMobile ? 65 : 10, scrollBehavior: "smooth" }}>
      <Cabezal texto="Exterior" />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginTop: 12,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <button onClick={fetchLast10} disabled={loading}>
          {loading ? "Actualizando..." : "Refrescar"}
        </button>

        {!loading && hasNews && <span style={{ fontSize: 14 }}>🆕 Hay novedades</span>}
      </div>

      {showInitialSpinner ? (
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
      ) : isEmpty ? (
        // ✅ NUEVO: mensaje cuando está vacío
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <p style={{ color: "gray", fontSize: 14, textAlign: "center", maxWidth: 420 }}>
            No hay compras para mostrar ahora mismo. Pulsa <b>Refrescar</b> en unos segundos.
          </p>
        </div>
      ) : (
        // ✅ PASAR userName A CajaItem (MemoizedCajaItem)
        <MemoizedCajaItem dats={data} venta={false} valor="Exterior" userName={userName} />
      )}
    </div>
  );
}

export default Exterior;
