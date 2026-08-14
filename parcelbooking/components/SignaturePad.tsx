/**
 * Signature pad without react-native-svg (avoids Metro resolve bugs).
 * Renders strokes with Views; persists as SVG data URL.
 */

import React, { useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  TouchableOpacity,
  Text,
} from "react-native";

type Point = { x: number; y: number };
type Props = {
  height?: number;
  strokeColor?: string;
  onChange: (dataUrl: string | null) => void;
};

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (const p of rest) {
    d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}

function Segment({
  a,
  b,
  color,
}: {
  a: Point;
  b: Point;
  color: string;
}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 0.1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: a.x,
        top: a.y - 1.25,
        width: len,
        height: 2.5,
        backgroundColor: color,
        borderRadius: 2,
        transform: [{ rotate: `${angle}deg` }],
        transformOrigin: "left center",
      }}
    />
  );
}

export function SignaturePad({
  height = 160,
  strokeColor = "#111111",
  onChange,
}: Props) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [current, setCurrent] = useState<Point[]>([]);
  const strokesRef = useRef<Point[][]>([]);
  const currentRef = useRef<Point[]>([]);
  const widthRef = useRef(300);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emit = (next: Point[][]) => {
    strokesRef.current = next;
    setStrokes(next);
    if (next.length === 0) {
      onChangeRef.current(null);
      return;
    }
    const paths = next.map(pointsToPath).filter(Boolean).join(" ");
    const w = widthRef.current;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}"><path d="${paths}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    onChangeRef.current(
      `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    );
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const pts = [{ x: locationX, y: locationY }];
          currentRef.current = pts;
          setCurrent(pts);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const pts = [...currentRef.current, { x: locationX, y: locationY }];
          currentRef.current = pts;
          setCurrent(pts);
        },
        onPanResponderRelease: () => {
          const pts = currentRef.current;
          currentRef.current = [];
          setCurrent([]);
          if (pts.length > 1) {
            emit([...strokesRef.current, pts]);
          }
        },
      }),
    [height, strokeColor]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width || 300;
  };

  const allStrokes = current.length ? [...strokes, current] : strokes;

  return (
    <View>
      <View
        style={[styles.pad, { height }]}
        onLayout={onLayout}
        {...pan.panHandlers}
      >
        {allStrokes.map((stroke, si) =>
          stroke.slice(1).map((b, i) => (
            <Segment
              key={`${si}-${i}`}
              a={stroke[i]}
              b={b}
              color={strokeColor}
            />
          ))
        )}
        {allStrokes.length === 0 && (
          <Text style={styles.hint}>Sign here</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => {
          currentRef.current = [];
          setCurrent([]);
          emit([]);
        }}
        style={styles.clearBtn}
      >
        <Text style={styles.clearText}>Clear signature</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
    justifyContent: "center",
  },
  hint: {
    position: "absolute",
    alignSelf: "center",
    color: "#9CA3AF",
    fontSize: 14,
  },
  clearBtn: {
    alignSelf: "flex-end",
    marginTop: 8,
    paddingVertical: 4,
  },
  clearText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
});
