export type Poi = {
  name: string;
  category: "bakery" | "coffee" | "food" | "sight";
  description: string;
};

export const poisByStation: Record<string, Poi[]> = {
  "arts-center": [
    {
      name: "High Museum of Art",
      category: "sight",
      description: "Major art museum, short walk from the station.",
    },
    {
      name: "Caribou Coffee",
      category: "coffee",
      description: "Quick coffee stop on the way to the Woodruff Arts Center.",
    },
  ],
  midtown: [
    {
      name: "Piedmont Park",
      category: "sight",
      description: "Atlanta's flagship park, a few blocks east.",
    },
    {
      name: "Highland Bakery",
      category: "bakery",
      description: "Brunch spot known for biscuits and pastries.",
    },
  ],
  "five-points": [
    {
      name: "Underground Atlanta",
      category: "sight",
      description: "Historic shopping district right above the station.",
    },
  ],
};
