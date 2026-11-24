import { COLORS, FONTS as F } from "./_brand.mjs";

export const FORMAT = { width: 1280, height: 640, name: "snap-x-preview.png" };
export const FONTS = F;

// Colors
const BG = COLORS.bg;           // cream #f3eee3
const TEXT = COLORS.text;        // ink #111111
const MUTED = "rgba(17,17,17,0.45)";
const ACCENT = COLORS.accent;    // red #eb1d25
const TERM_BG = "#1c1c1e";
const TERM_HEADER = "#2a2a2c";
const TERM_TEXT = "#e8e8e8";
const TERM_MUTED = "#888";
const GREEN = "#22c55e";

function pill(label, filled) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        border: `1.5px solid ${filled ? ACCENT : "rgba(235,29,37,0.4)"}`,
        background: filled ? ACCENT : "transparent",
        borderRadius: 999,
        paddingTop: 7,
        paddingBottom: 7,
        paddingLeft: 16,
        paddingRight: 16,
        marginRight: 10,
      },
      children: [
        {
          type: "span",
          props: {
            style: {
              display: "flex",
              fontSize: 16,
              fontWeight: 600,
              color: filled ? COLORS.bg : ACCENT,
              fontFamily: "Saira",
              whiteSpace: "nowrap",
            },
            children: [label],
          },
        },
      ],
    },
  };
}

function termRow(filename, size) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
      },
      children: [
        // Green dot
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: 8,
              height: 8,
              borderRadius: 999,
              background: GREEN,
              marginRight: 12,
              flexShrink: "0",
            },
            children: [],
          },
        },
        // Filename
        {
          type: "span",
          props: {
            style: {
              display: "flex",
              fontSize: 15,
              fontWeight: 400,
              color: TERM_TEXT,
              fontFamily: "Saira",
              flex: 1,
            },
            children: [filename],
          },
        },
        // Size
        {
          type: "span",
          props: {
            style: {
              display: "flex",
              fontSize: 13,
              fontWeight: 400,
              color: TERM_MUTED,
              fontFamily: "Saira",
              whiteSpace: "nowrap",
            },
            children: [size],
          },
        },
      ],
    },
  };
}

export default function () {
  // Terminal window (right side)
  const terminal = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        background: TERM_BG,
        borderRadius: 14,
        overflow: "hidden",
        width: 460,
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      },
      children: [
        // Terminal header bar
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              background: TERM_HEADER,
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 16,
              paddingRight: 16,
              gap: 8,
            },
            children: [
              // Traffic lights
              { type: "div", props: { style: { display: "flex", width: 12, height: 12, borderRadius: 999, background: "#ff5f57" }, children: [] } },
              { type: "div", props: { style: { display: "flex", width: 12, height: 12, borderRadius: 999, background: "#ffbd2e" }, children: [] } },
              { type: "div", props: { style: { display: "flex", width: 12, height: 12, borderRadius: 999, background: "#28c840" }, children: [] } },
              {
                type: "span",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 13,
                    color: TERM_MUTED,
                    fontFamily: "Saira",
                    marginLeft: 10,
                  },
                  children: ["terminal"],
                },
              },
            ],
          },
        },
        // Terminal body
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              paddingTop: 24,
              paddingBottom: 24,
              paddingLeft: 24,
              paddingRight: 24,
            },
            children: [
              // Command line
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 20,
                    gap: 10,
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: { display: "flex", fontSize: 15, color: ACCENT, fontFamily: "Saira", fontWeight: 700 },
                        children: ["$"],
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: { display: "flex", fontSize: 14, color: TERM_TEXT, fontFamily: "Saira" },
                        children: ["snap-x render designs/*.mjs"],
                      },
                    },
                  ],
                },
              },
              // Output rows
              termRow("og.png", "1200×630"),
              termRow("github-social-preview.png", "1280×640"),
              termRow("x-header.png", "1500×500"),
              termRow("linkedin-cover.png", "1584×396"),
              // Footer
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: `1px solid rgba(255,255,255,0.08)`,
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: { display: "flex", fontSize: 13, color: TERM_MUTED, fontFamily: "Saira" },
                        children: ["4 images rendered in 1.4s"],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  // Left side content
  const leftContent = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
        paddingLeft: 72,
        paddingRight: 48,
        paddingTop: 72,
        paddingBottom: 72,
      },
      children: [
        // Title
        {
          type: "div",
          props: {
            style: { display: "flex", marginBottom: 20 },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 80,
                    fontWeight: 900,
                    color: ACCENT,
                    fontFamily: "Saira",
                    letterSpacing: "-0.03em",
                    lineHeight: "1",
                    whiteSpace: "nowrap",
                  },
                  children: ["snap-x"],
                },
              },
            ],
          },
        },
        // Tagline line 1
        {
          type: "div",
          props: {
            style: { display: "flex", marginBottom: 4 },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 700,
                    color: TEXT,
                    fontFamily: "Saira",
                    whiteSpace: "nowrap",
                  },
                  children: ["Render Satori design files into"],
                },
              },
            ],
          },
        },
        // Tagline line 2
        {
          type: "div",
          props: {
            style: { display: "flex", marginBottom: 32 },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 700,
                    color: TEXT,
                    fontFamily: "Saira",
                    whiteSpace: "nowrap",
                  },
                  children: ["platform-ready PNGs."],
                },
              },
            ],
          },
        },
        // Pills
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "row", alignItems: "center", marginBottom: 28 },
            children: [pill("CLI"), pill("Satori"), pill("Node.js"), pill("v0.2.1", true)],
          },
        },
        // Command
        {
          type: "div",
          props: {
            style: { display: "flex" },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 15,
                    fontWeight: 400,
                    color: MUTED,
                    fontFamily: "Saira",
                    whiteSpace: "nowrap",
                  },
                  children: ["$npx @snap-x/cli render designs/*.mjs"],
                },
              },
            ],
          },
        },
      ],
    },
  };

  // Decorative circle bottom-right of canvas
  const decCircle = {
    type: "div",
    props: {
      style: {
        display: "flex",
        position: "absolute",
        right: -60,
        bottom: -80,
        width: 320,
        height: 320,
        borderRadius: 999,
        background: "rgba(235,29,37,0.07)",
      },
      children: [],
    },
  };

  const decCircle2 = {
    type: "div",
    props: {
      style: {
        display: "flex",
        position: "absolute",
        right: 60,
        bottom: -120,
        width: 220,
        height: 220,
        borderRadius: 999,
        background: "rgba(235,29,37,0.05)",
      },
      children: [],
    },
  };

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: 1280,
        height: 640,
        background: BG,
        fontFamily: "Saira",
        position: "relative",
        overflow: "hidden",
      },
      children: [
        decCircle,
        decCircle2,
        leftContent,
        // Right side: terminal centered
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingRight: 72,
              paddingLeft: 24,
            },
            children: [terminal],
          },
        },
      ],
    },
  };
}
