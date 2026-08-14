import AsyncStorage from "@react-native-async-storage/async-storage";

const SAVED_KEY = "pw_saved_locations_v1";

export interface SavedLocation {
  id: string;
  label: string;       // "Home", "Work", or custom
  icon: "home" | "briefcase" | "map-pin";
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lon: number;
  savedAt: number;     // timestamp ms
}

const load = async (): Promise<SavedLocation[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persist = async (list: SavedLocation[]) => {
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(list));
};

export const getSavedLocations = async (): Promise<SavedLocation[]> => {
  const list = await load();
  return list.sort((a, b) => b.savedAt - a.savedAt);
};

export const upsertSavedLocation = async (
  loc: Omit<SavedLocation, "id" | "savedAt"> & { id?: string }
): Promise<SavedLocation> => {
  const list = await load();
  const id = loc.id || `loc_${Date.now()}`;
  const entry: SavedLocation = { ...loc, id, savedAt: Date.now() };
  const idx = list.findIndex((l) => l.id === id);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  await persist(list);
  return entry;
};

export const deleteSavedLocation = async (id: string): Promise<void> => {
  const list = await load();
  await persist(list.filter((l) => l.id !== id));
};

export const getHomeLocation = async (): Promise<SavedLocation | null> => {
  const list = await load();
  return list.find((l) => l.id === "home") ?? null;
};

export const saveHomeLocation = async (
  loc: Omit<SavedLocation, "id" | "savedAt" | "label" | "icon">
): Promise<SavedLocation> => {
  return upsertSavedLocation({ ...loc, id: "home", label: "Home", icon: "home" });
};
