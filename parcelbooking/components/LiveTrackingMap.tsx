/**
 * In-app Google Map for live parcel tracking.
 * Markers update in place — MapView is not remounted on poll.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  Region,
  LatLng,
} from "react-native-maps";

const MAP_PROVIDER = Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
import { colors } from "../theme/colors";

export type MapPoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
};

type Props = {
  pickup?: MapPoint | null;
  drop?: MapPoint | null;
  rider?: MapPoint | null;
  height?: number;
};

function isValidPoint(p?: MapPoint | null): p is MapPoint {
  return (
    !!p &&
    typeof p.latitude === "number" &&
    typeof p.longitude === "number" &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude)
  );
}

function toCoord(p: MapPoint): LatLng {
  return { latitude: p.latitude, longitude: p.longitude };
}

function buildRegion(points: MapPoint[]): Region {
  if (points.length === 0) {
    return {
      latitude: 20.5937,
      longitude: 78.9629,
      latitudeDelta: 12,
      longitudeDelta: 12,
    };
  }
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latDelta = Math.max((maxLat - minLat) * 1.6, 0.02);
  const lonDelta = Math.max((maxLon - minLon) * 1.6, 0.02);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
}

export function LiveTrackingMap({
  pickup,
  drop,
  rider,
  height = 240,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const fittedKey = useRef<string>("");

  const points = useMemo(() => {
    const list: MapPoint[] = [];
    if (isValidPoint(pickup)) list.push(pickup);
    if (isValidPoint(drop)) list.push(drop);
    if (isValidPoint(rider)) list.push(rider);
    return list;
  }, [pickup, drop, rider]);

  const hasMap = points.length > 0;
  const hasRider = isValidPoint(rider);

  // Fit once when the set of anchors changes (not on every rider blink)
  useEffect(() => {
    if (!hasMap || !mapRef.current) return;
    const key = [
      isValidPoint(pickup) ? `${pickup.latitude},${pickup.longitude}` : "",
      isValidPoint(drop) ? `${drop.latitude},${drop.longitude}` : "",
      hasRider ? "rider" : "",
    ].join("|");
    if (key === fittedKey.current) return;
    fittedKey.current = key;
    const coords = points.map(toCoord);
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [hasMap, pickup, drop, hasRider, points]);

  if (!hasMap) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>
          Map unavailable — location not set for this booking
        </Text>
      </View>
    );
  }

  const initialRegion = buildRegion(points);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {isValidPoint(pickup) && (
          <Marker
            coordinate={toCoord(pickup)}
            title={pickup.title || "Pickup"}
            description={pickup.description}
            pinColor={colors.success}
            identifier="pickup"
          />
        )}
        {isValidPoint(drop) && (
          <Marker
            coordinate={toCoord(drop)}
            title={drop.title || "Drop"}
            description={drop.description}
            pinColor={colors.primary}
            identifier="drop"
          />
        )}
        {isValidPoint(rider) && (
          <Marker
            coordinate={toCoord(rider)}
            title={rider.title || "Rider"}
            description={rider.description}
            pinColor={colors.info}
            identifier="rider"
            tracksViewChanges={false}
          />
        )}
      </MapView>
      <View style={styles.legend}>
        {isValidPoint(pickup) && (
          <Text style={styles.legendItem}>
            <Text style={{ color: colors.success }}>● </Text>Pickup
          </Text>
        )}
        {isValidPoint(drop) && (
          <Text style={styles.legendItem}>
            <Text style={{ color: colors.primary }}>● </Text>Drop
          </Text>
        )}
        {isValidPoint(rider) && (
          <Text style={styles.legendItem}>
            <Text style={{ color: colors.info }}>● </Text>Rider
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.gray[100],
  },
  placeholder: {
    borderRadius: 12,
    backgroundColor: colors.gray[100],
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  legend: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  legendItem: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
  },
});
