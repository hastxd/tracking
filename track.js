const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`https://${SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

function getTrackingMessage(daysSinceOrder) {
  if (daysSinceOrder <= 3) {
    return {
      title: "En cours de préparation 📦",
      message: "Votre commande est en cours de préparation. Elle sera expédiée très prochainement.",
      color: "#f59e0b",
    };
  } else if (daysSinceOrder <= 7) {
    return {
      title: "En route vers vous 🚚",
      message: "Votre commande a été expédiée et est en cours d'acheminement. Comptez encore quelques jours.",
      color: "#3b82f6",
    };
  } else if (daysSinceOrder <= 14) {
    return {
      title: "Livraison imminente 🎯",
      message: "Votre colis est proche de chez vous. Vous devriez le recevoir dans les prochains jours.",
      color: "#10b981",
    };
  } else {
    return {
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

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { order_number } = req.query;
  if (!order_number) return res.status(400).json({ error: "Numéro de commande manquant" });

  try {
    const token = await getAccessToken();

    const query = `{
      orders(first: 1, query: "name:#${order_number}") {
        edges {
          node {
            name
            createdAt
          }
        }
      }
    }`;

    const orderResponse = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!orderResponse.ok) {
      throw new Error(`Shopify API error: ${orderResponse.status}`);
    }

    const result = await orderResponse.json();
    const edges = result?.data?.orders?.edges;

    if (!edges || edges.length === 0) {
      return res.status(404).json({ error: "Commande introuvable. Vérifiez votre numéro de commande." });
    }

    const order = edges[0].node;
    const orderDate = new Date(order.createdAt);
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
    return res.status(500).json({ error: error.message || "Une erreur est survenue." });
  }
}
