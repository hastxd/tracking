const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${SHOPIFY_CLIENT_ID}:${SHOPIFY_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get access token");
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

function getTrackingMessage(daysSinceOrder) {
  if (daysSinceOrder < 0) {
    return {
      status: "processing",
      title: "Commande reçue ✓",
      message: "Votre commande a bien été reçue et est en cours de traitement.",
      color: "#6366f1",
    };
  } else if (daysSinceOrder <= 3) {
    return {
      status: "processing",
      title: "En cours de préparation 📦",
      message: "Votre commande est en cours de préparation. Elle sera expédiée très prochainement.",
      color: "#f59e0b",
    };
  } else if (daysSinceOrder <= 7) {
    return {
      status: "shipped",
      title: "En route vers vous 🚚",
      message: "Votre commande a été expédiée et est en cours d'acheminement. Comptez encore quelques jours.",
      color: "#3b82f6",
    };
  } else if (daysSinceOrder <= 14) {
    return {
      status: "nearDelivery",
      title: "Livraison imminente 🎯",
      message: "Votre colis est proche de chez vous. Vous devriez le recevoir dans les prochains jours.",
      color: "#10b981",
    };
  } else {
    return {
      status: "delivered",
      title: "Livraison attendue ✅",
      message: "Votre colis devrait déjà être livré. Si ce n'est pas le cas, contactez notre support.",
      color: "#ef4444",
    };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { order_number } = req.query;

  if (!order_number) {
    return res.status(400).json({ error: "Numéro de commande manquant" });
  }

  try {
    const token = await getAccessToken();

    const orderResponse = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2024-01/orders.json?name=%23${order_number}&status=any`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    if (!orderResponse.ok) {
      throw new Error("Shopify API error");
    }

    const orderData = await orderResponse.json();

    if (!orderData.orders || orderData.orders.length === 0) {
      return res.status(404).json({ error: "Commande introuvable. Vérifiez votre numéro de commande." });
    }

    const order = orderData.orders[0];
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

    const trackingInfo = getTrackingMessage(daysSinceOrder);

    return res.status(200).json({
      order_number: order.name,
      order_date: orderDate.toLocaleDateString("fr-FR"),
      days_since_order: daysSinceOrder,
      ...trackingInfo,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Une erreur est survenue. Réessayez dans quelques instants." });
  }
}
