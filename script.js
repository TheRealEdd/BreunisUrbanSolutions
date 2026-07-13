const tl = gsap.timeline();

gsap.set("#bus-stop", {
    scaleY: 0,
    transformOrigin: "bottom center"
});

gsap.set("#woman", {
    scaleY: 0,
    transformOrigin: "bottom center"
});

gsap.set("#bus", {
    x: "-150vw"
});
gsap.set("#text-1", { opacity: 0, y: 10 });
gsap.set("#text-2", { opacity: 0, y: 10 });


tl.to(
    ["#bus-stop"],
    {
        scaleY: 1,
        duration: 1,
        ease: "elastic.out(0.4)"
    }
);

tl.to("#woman", {
        scaleY: 1,
        duration: 1,
        ease: "elastic.out(0.4)"
    }, "-=0.9");

tl.to("#text-1", { opacity: 1 });

tl.to({}, { duration: 1 });

tl.to("#text-1", { opacity: 0 });

tl.to("#text-2", { opacity: 1 });

tl.to({}, { duration: 1 });



tl.to("#bus", {
    x: "100vw", // adjust later for alignment
    duration: 3,
    ease: "power3.out"
}, "<"); // can overlap with stop collapsing if you want

tl.to("#bus-stop", {
    scaleY: 0,
    duration: 1,
    ease: "elastic.in(0.4)"
}, "-=2.5");

tl.to("#woman", {
    scaleX: -1,
    duration: 0.5,
    ease: "sine.inOut(1)"
}, "-=0.5");

tl.to("#woman", {
    x: "10vw",
    duration: 1
});

tl.to("#woman", {
    x: "12vw",
    opacity: "0",
    duration: 0.5
});

tl.to("#bus", {
    x: "200vw", // adjust later for alignment
    duration: 3,
    ease: "power3.in"
});


tl.to("#text-2", { opacity: 0 }, "<");

tl.to("#intro-modal", {
    y: "-100%",
    duration: 1,
    ease: "power3.inOut"
});




// Route Drawing
function drawRoute() {
    const svg = document.getElementById("route-svg");
    const section = document.getElementById("projects");
    if (!svg || !section) return;

    // ==========================================
    // 🎛️ CONFIGURATION VARIABLES
    // ==========================================
    const CORNER_RADIUS = 45; // Smoothness of the 90-degree tube bends
    const FINAL_DROP = 0;     // Line turns left exactly at the final element boundary

    // Clear previous vector drawings on resize/reload
    svg.innerHTML = "";

    const sectionRect = section.getBoundingClientRect();

    // 1. Automatically collect the starting button and all stops in exact DOM layout order
    const startEl = document.getElementById("line-start");
    const stopElements = Array.from(section.querySelectorAll(".route-stop"));
    
    if (!startEl) return;
    const allElements = [startEl, ...stopElements];
    const points = [];

    // 2. Map structural coordinates relative to the #projects container
    allElements.forEach((el) => {
        const anchor = el.querySelector(".route-anchor");
        const targetRect = anchor ? anchor.getBoundingClientRect() : el.getBoundingClientRect();

        const x = targetRect.left + targetRect.width / 2 - sectionRect.left;
        const y = targetRect.top + targetRect.height / 2 - sectionRect.top;
        const hasCircle = el.getAttribute("data-circle") === "true";

        points.push({ x, y, circle: hasCircle });
    });

    if (points.length === 0) return;

    // 3. Generate a strict rectangular/orthogonal grid vertex array
    const vertices = [];
    vertices.push({ x: points[0].x, y: points[0].y });

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];

        if (i === 1) {
            // FIRST TRANSITION: Exit the start element horizontally to the side immediately
            if (prev.x !== curr.x) {
                vertices.push({ x: curr.x, y: prev.y });
            }
        } else {
            // INTERMEDIATE TRANSITIONS: Use the vertical midpoint to clear elements safely
            const midY = (prev.y + curr.y) / 2;
            if (prev.x !== curr.x) {
                vertices.push({ x: prev.x, y: midY });
                vertices.push({ x: curr.x, y: midY });
            }
        }
        vertices.push({ x: curr.x, y: curr.y });
    }

    // END OF LINE SYSTEM: Wrap around the bottom element, then fire off-screen left
    const lastPoint = points[points.length - 1];
    vertices.push({ x: lastPoint.x, y: lastPoint.y + FINAL_DROP });
    vertices.push({ x: -1000, y: lastPoint.y + FINAL_DROP }); // Extends past the left SVG view boundary

    // 4. Trace vertices and inject controlled rounded curves at sharp intersections
    let pathString = `M ${vertices[0].x} ${vertices[0].y}`;

    // Loops until the second-to-last vertex so pNext targets the final destination point (-1000)
    for (let i = 1; i < vertices.length - 1; i++) {
        const pPrev = vertices[i - 1];
        const pCurr = vertices[i];
        const pNext = vertices[i + 1];

        // Measure surrounding segment lengths
        const len1 = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
        const len2 = Math.hypot(pNext.x - pCurr.x, pNext.y - pCurr.y);

        // Safety catch: ensures the radius shrinks automatically if items are tightly packed
        const actualR = Math.min(CORNER_RADIUS, len1 / 2, len2 / 2);

        // Check if this vertex actually forms a corner (is not a straight line)
        const isCorner = (pPrev.x !== pNext.x) && (pPrev.y !== pNext.y);

        if (actualR > 0 && isCorner) {
            // Find Point A (where the line starts breaking into the curve)
            const dirX1 = Math.sign(pCurr.x - pPrev.x);
            const dirY1 = Math.sign(pCurr.y - pPrev.y);
            const ax = pCurr.x - dirX1 * actualR;
            const ay = pCurr.y - dirY1 * actualR;

            // Find Point B (where the curve terminates back into a straight line)
            const dirX2 = Math.sign(pNext.x - pCurr.x);
            const dirY2 = Math.sign(pNext.y - pCurr.y);
            const bx = pCurr.x + dirX2 * actualR;
            const by = pCurr.y + dirY2 * actualR;

            // Draw straight to the curve entry point, then arc cleanly around the corner vertex
            pathString += ` L ${ax} ${ay} Q ${pCurr.x} ${pCurr.y} ${bx} ${by}`;
        } else {
            pathString += ` L ${pCurr.x} ${pCurr.y}`;
        }
    }

    // Seal the vector path: Draw from the curve exit directly out to the off-screen left point
    const lastV = vertices[vertices.length - 1];
    pathString += ` L ${lastV.x} ${lastV.y}`;

    // Create and append the final transit line path
    const route = document.createElementNS("http://www.w3.org/2000/svg", "path");
    route.setAttribute("d", pathString);
    route.setAttribute("fill", "none");
    route.setAttribute("stroke", "var(--yellow)");
    route.setAttribute("stroke-width", "20"); 
    route.setAttribute("stroke-linecap", "round");
    route.setAttribute("stroke-linejoin", "round");
    svg.appendChild(route);

    // 5. Build individual station stops onto active circles
    points.forEach((point) => {
        if (!point.circle) return;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", point.x);
        circle.setAttribute("cy", point.y);
        circle.setAttribute("r", 24);

        circle.setAttribute("fill", "#ffffff");
        circle.setAttribute("stroke", "var(--charcoal)");
        circle.setAttribute("stroke-width", "6");

        svg.appendChild(circle);
    });
}

// Global UI listeners
window.addEventListener("load", drawRoute);
window.addEventListener("resize", drawRoute);

if (document.getElementById("projects")) {
    new ResizeObserver(drawRoute).observe(document.getElementById("projects"));
}

window.addEventListener("load", () => {
  const track = document.getElementById("logoTrack");

  // total width = 2 halves; shift = half of total
  const half = track.scrollWidth / 2;

  track.style.setProperty("--shift", half);
});
