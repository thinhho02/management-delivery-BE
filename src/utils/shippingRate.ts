export const SHIPPING_ZONES = {
  A: {
    label: "Nội tỉnh",
    steps: [
      { maxWeight: 0.5, price: 21900 },
      { maxWeight: 1.0, price: 23120 },
      { maxWeight: 1.5, price: 26800 },
      { maxWeight: 2.0, price: 30000 }
    ],
    extraPerHalfKg: 7400
  },

  B: {
    label: "< 100 km",
    steps: [
      { maxWeight: 0.5, price: 24080 },
      { maxWeight: 1.0, price: 27600 },
      { maxWeight: 1.5, price: 32880 },
      { maxWeight: 2.0, price: 36320 }
    ],
    extraPerHalfKg: 9400
  },

  C: {
    label: "100 - 300 km",
    steps: [
      { maxWeight: 0.5, price: 28800 },
      { maxWeight: 1.0, price: 33120 },
      { maxWeight: 1.5, price: 39360 },
      { maxWeight: 2.0, price: 44080 }
    ],
    extraPerHalfKg: 10900
  },

  D: {
    label: "> 300 km",
    steps: [
      { maxWeight: 0.5, price: 35880 },
      { maxWeight: 1.0, price: 40920 },
      { maxWeight: 1.5, price: 53920 },
      { maxWeight: 2.0, price: 72640 }
    ],
    extraPerHalfKg: 14100
  }
};
