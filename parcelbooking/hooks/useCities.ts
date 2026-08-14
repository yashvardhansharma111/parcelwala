import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { mapApi } from "../services/apiClient";
import { City } from "../components/AddressForm";

export const useCities = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await mapApi.getCities();
      const list = response?.cities || [];
      if (Array.isArray(list) && list.length > 0) {
        const valid = list
          .filter(
            (c: any) =>
              c &&
              typeof c.name === "string" &&
              c.name.trim().length > 0 &&
              c.isActive !== false
          )
          .map((c: any) => ({
            id: c.id || c.name,
            name: c.name.trim(),
            state: c.state || "",
          }));
        setCities(valid);
      } else {
        setCities([]);
      }
    } catch (error) {
      console.error("[Cities] Error loading cities:", error);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { cities, loading };
};
