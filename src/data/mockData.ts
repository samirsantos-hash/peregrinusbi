export interface Seller {
  id: string;
  nickname: string;
  custId: string;
}

export interface SellerKPI {
  sellerId: string;
  date: string;
  gmv: number;
  tsi: number;
  pads: number;
  roas: number;
  acos: number;
  tacos: number;
  cpa: number;
  adsInvestment: number;
  revenue: number;
  scorePhoto: number;
  scoreTitle: number;
  visits: number;
  visitsExpensive: number;
  sellerPrice: number;
  minPriceRival: number;
  pctFull: number;
  pctFlex: number;
  pctPostagem: number;
  upliftGmvM1: number;
  productName: string;
  productId: string;
  statusPhoto: string;
  statusTitle: string;
}

export const sellers: Seller[] = [
  { id: "1", nickname: "TechStore_BR", custId: "CUS-001234" },
  { id: "2", nickname: "MegaShop_SP", custId: "CUS-005678" },
  { id: "3", nickname: "TopSeller_RJ", custId: "CUS-009012" },
  { id: "4", nickname: "EletroMax", custId: "CUS-003456" },
];

const generateTimeSeriesData = (days: number, sellerId: string): SellerKPI[] => {
  const data: SellerKPI[] = [];
  const baseDate = new Date("2026-02-01");

  const products = [
    { name: "Fone Bluetooth TWS Pro", id: "MLB-001" },
    { name: "Carregador Turbo 65W", id: "MLB-002" },
    { name: "Capa iPhone 15 Silicone", id: "MLB-003" },
    { name: "Mouse Gamer RGB 12000DPI", id: "MLB-004" },
    { name: "Teclado Mecânico 60%", id: "MLB-005" },
    { name: "Webcam Full HD 1080p", id: "MLB-006" },
    { name: "Hub USB-C 7 em 1", id: "MLB-007" },
    { name: "SSD NVMe 1TB Gen4", id: "MLB-008" },
  ];

  for (let d = 0; d < days; d++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + d);

    for (const product of products) {
      const baseGmv = 1500 + Math.random() * 3000;
      const baseRoas = 1.5 + Math.random() * 4;
      const scorePhoto = Math.floor(40 + Math.random() * 60);
      const scoreTitle = Math.floor(45 + Math.random() * 55);
      const sellerPrice = 50 + Math.random() * 200;
      const rival = sellerPrice * (0.85 + Math.random() * 0.3);

      data.push({
        sellerId,
        date: date.toISOString().split("T")[0],
        gmv: Math.round(baseGmv),
        tsi: Math.round(baseGmv * 0.85),
        pads: Math.floor(10 + Math.random() * 50),
        roas: Math.round(baseRoas * 100) / 100,
        acos: Math.round((1 / baseRoas) * 10000) / 100,
        tacos: Math.round((Math.random() * 15 + 5) * 100) / 100,
        cpa: Math.round((10 + Math.random() * 30) * 100) / 100,
        adsInvestment: Math.round(baseGmv / baseRoas),
        revenue: Math.round(baseGmv),
        scorePhoto,
        scoreTitle,
        visits: Math.floor(100 + Math.random() * 2000),
        visitsExpensive: Math.floor(Math.random() * 500),
        sellerPrice: Math.round(sellerPrice * 100) / 100,
        minPriceRival: Math.round(rival * 100) / 100,
        pctFull: Math.round(30 + Math.random() * 40),
        pctFlex: Math.round(10 + Math.random() * 30),
        pctPostagem: 0,
        upliftGmvM1: Math.round((0.05 + Math.random() * 0.25) * 100) / 100,
        productName: product.name,
        productId: product.id,
        statusPhoto: scorePhoto < 70 ? "Revisar" : "OK",
        statusTitle: scoreTitle < 70 ? "Revisar" : "OK",
      });
    }
  }

  // fill pctPostagem
  data.forEach((d) => {
    d.pctPostagem = Math.max(0, 100 - d.pctFull - d.pctFlex);
  });

  return data;
};

export const sellerKPIs: Record<string, SellerKPI[]> = {
  "1": generateTimeSeriesData(30, "1"),
  "2": generateTimeSeriesData(30, "2"),
  "3": generateTimeSeriesData(30, "3"),
  "4": generateTimeSeriesData(30, "4"),
};

export const getDiagnostic = (kpi: SellerKPI) => {
  const alerts: { icon: string; label: string; severity: "critical" | "warning" | "success" }[] = [];

  if (kpi.scorePhoto < 70) alerts.push({ icon: "📸", label: "Melhorar Fotos", severity: "critical" });
  if (kpi.scoreTitle < 70) alerts.push({ icon: "❌", label: "Ajustar SEO", severity: "critical" });
  if (kpi.roas < 2) alerts.push({ icon: "💸", label: "Revisar Verba Ads", severity: "warning" });

  const gap = ((kpi.sellerPrice - kpi.minPriceRival) / kpi.minPriceRival) * 100;
  if (gap > 5) alerts.push({ icon: "💰", label: "Preço não Competitivo", severity: "warning" });

  if (alerts.length === 0) alerts.push({ icon: "🏆", label: "Anúncio Campeão", severity: "success" });

  return alerts;
};
