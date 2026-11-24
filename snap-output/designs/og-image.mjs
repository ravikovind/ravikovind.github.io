export const FORMAT = { width: 1200, height: 630, name: "og-image" };
export const FONTS = [{ family: "Saira", weights: [400, 600, 700, 800] }];

const CREAM  = "#f3eee3";
const CARD   = "#ebe5d8";
const INK    = "#111111";
const RED    = "#eb1d25";
const MUTED  = "rgba(17,17,17,0.5)";

export default function () {
  return {
    type: "div",
    props: {
      style: {
        display: "flex", width: 1200, height: 630,
        background: CREAM, fontFamily: "Saira, sans-serif",
        padding: "64px 80px", flexDirection: "column", justifyContent: "space-between",
      },
      children: [

        // Top — name + url
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: 16 },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex", width: 52, height: 52, borderRadius: 999,
                    background: CARD, border: `2px solid ${INK}`,
                    alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 800, color: INK,
                  },
                  children: ["RK"],
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: 2 },
                  children: [
                    { type: "span", props: { style: { fontSize: 20, fontWeight: 700, color: INK }, children: ["Ravi Kovind"] } },
                    { type: "span", props: { style: { fontSize: 14, color: MUTED }, children: ["ravikovind.github.io"] } },
                  ],
                },
              },
            ],
          },
        },

        // Middle — headline
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: 8 },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 96, fontWeight: 800, color: INK, lineHeight: 1 },
                  children: ["Founding"],
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 96, fontWeight: 800, color: RED, lineHeight: 1 },
                  children: ["Engineer"],
                },
              },
            ],
          },
        },

        // Bottom — tags + description
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: 20 },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", gap: 12 },
                  children: ["Full-Stack", "Mobile", "Backend", "Infrastructure"].map(t => ({
                    type: "div",
                    props: {
                      style: {
                        display: "flex", padding: "8px 18px", borderRadius: 999,
                        border: `1.5px solid ${INK}`, fontSize: 16, fontWeight: 600, color: INK,
                      },
                      children: [t],
                    },
                  })),
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 20, color: MUTED, lineHeight: 1.5 },
                  children: ["5+ years shipping products from 0 to 1 \u2014 full-stack, mobile & AI infrastructure."],
                },
              },
            ],
          },
        },

      ],
    },
  };
}
