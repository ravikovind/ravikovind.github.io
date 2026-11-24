export const FORMAT = { width: 1920, height: 803, name: "ss" };
export const FONTS = [{ family: "Saira", weights: [400, 500, 600, 700, 800] }];
import { HERO_URI } from "./_hero-uri.mjs";

const CREAM  = "#f3eee3";
const CARD   = "#ebe5d8";
const INK    = "#111111";
const RED    = "#eb1d25";
const MUTED  = "rgba(17,17,17,0.5)";
const GREEN  = "#28c840";


export default function () {
  return {
    type: "div",
    props: {
      style: {
        display: "flex", width: 1920, height: 803,
        background: CREAM, fontFamily: "Saira, sans-serif",
        position: "relative", overflow: "hidden",
      },
      children: [

        // NAV
        {
          type: "div",
          props: {
            style: {
              display: "flex", position: "absolute", top: 0, left: 0, right: 0,
              height: 64, alignItems: "center", justifyContent: "space-between",
              padding: "0 56px", background: "rgba(243,238,227,0.95)",
              borderBottom: `1px solid ${CARD}`,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex", width: 38, height: 38, borderRadius: 999,
                    background: CARD, border: `1.5px solid ${INK}`,
                    alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: INK,
                  },
                  children: ["RK"],
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", gap: 36 },
                  children: [
                    ...["About", "Projects", "Experience"].map(t => ({
                      type: "span",
                      props: { style: { fontSize: 15, fontWeight: 500, color: MUTED }, children: [t] },
                    })),
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex", padding: "10px 24px", borderRadius: 999,
                          background: RED, color: CREAM, fontSize: 15, fontWeight: 700,
                        },
                        children: ["Get in Touch"],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // HERO LEFT
        {
          type: "div",
          props: {
            style: {
              display: "flex", flexDirection: "column", justifyContent: "center",
              paddingLeft: 96, paddingTop: 64, width: 860, height: 803,
            },
            children: [
              // label row
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", gap: 14, marginBottom: 32 },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center", gap: 8 },
                        children: [
                          { type: "div", props: { style: { display: "flex", width: 9, height: 9, borderRadius: 999, background: GREEN } } },
                          { type: "span", props: { style: { fontSize: 13, color: MUTED, fontWeight: 500 }, children: ["Open to Work"] } },
                        ],
                      },
                    },
                    { type: "span", props: { style: { color: CARD, fontSize: 16 }, children: ["|"] } },
                    { type: "span", props: { style: { fontSize: 13, color: MUTED, fontWeight: 500 }, children: ["Founding Engineer"] } },
                    { type: "span", props: { style: { color: CARD, fontSize: 16 }, children: ["|"] } },
                    { type: "span", props: { style: { fontSize: 13, color: MUTED, fontWeight: 500 }, children: ["5+ Years Experience"] } },
                  ],
                },
              },

              // Hey There!
              { type: "div", props: { style: { display: "flex", fontSize: 72, fontWeight: 800, color: INK, lineHeight: 1.1, marginBottom: 4 }, children: ["Hey There!"] } },

              // I'm Ravi
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "baseline", fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginBottom: 20 },
                  children: [
                    { type: "span", props: { style: { color: INK }, children: ["I'm\u00a0"] } },
                    { type: "span", props: { style: { color: RED }, children: ["Ravi"] } },
                  ],
                },
              },

              // tagline
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "baseline", fontSize: 30, fontWeight: 600, marginBottom: 28 },
                  children: [
                    { type: "span", props: { style: { color: INK }, children: ["I build systems with\u00a0"] } },
                    { type: "span", props: { style: { color: RED }, children: ["Correctness."] } },
                  ],
                },
              },

              // tags
              {
                type: "div",
                props: {
                  style: { display: "flex", gap: 24, marginBottom: 24 },
                  children: ["Full-Stack", "Mobile", "Backend", "Infrastructure"].map(t => ({
                    type: "span",
                    props: { style: { fontSize: 15, fontWeight: 600, color: INK }, children: [t] },
                  })),
                },
              },

              // description
              {
                type: "div",
                props: {
                  style: { display: "flex", fontSize: 17, color: MUTED, lineHeight: 1.65, maxWidth: 540, marginBottom: 44 },
                  children: ["I prioritize maintainability and ownership over shortcuts and hype. Clean code, predictable systems, and long-term thinking over quick fixes."],
                },
              },

              // buttons
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", gap: 16 },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", padding: "15px 36px", borderRadius: 999, background: INK, color: CREAM, fontSize: 16, fontWeight: 700 },
                        children: ["View Work"],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", padding: "14px 34px", borderRadius: 999, border: `1.5px solid ${INK}`, color: INK, fontSize: 16, fontWeight: 600 },
                        children: ["Get in Touch"],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // HERO RIGHT — hero-bg SVG illustration
        {
          type: "img",
          props: {
            src: HERO_URI,
            width: 860,
            height: 740,
            style: {
              display: "flex", position: "absolute",
              right: 0, top: 64,
              objectFit: "contain",
            },
          },
        },

      ],
    },
  };
}
