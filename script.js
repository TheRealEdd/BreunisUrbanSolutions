// Route Drawing
function drawRoute() {
    const svg = document.getElementById("route-svg");
    const section = document.getElementById("projects");
    if (!svg || !section) return;

    // ==========================================
    // 🎛️ CONFIGURATION VARIABLES
    // ==========================================
    const CORNER_RADIUS = 45; // Smoothness of the 90-degree tube bends
    const FINAL_DROP = 60;     // Line turns left exactly at the final element boundary

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

        // Calculate standard center coordinates
        let x = targetRect.left + targetRect.width / 2 - sectionRect.left;
        let y = targetRect.top + targetRect.height / 2 - sectionRect.top;
        
        // ONLY apply the right-edge wrap to the very last element
        const isLastElement = allElements === allElements.length - 1;
        
        if (isLastElement) {
            const paddingOffset = 20; // Extra clearance outside the card boundary
            
            // Use the FULL ARTICLE's right edge instead of the inner anchor
            x = containerRect.right - sectionRect.left + paddingOffset;
        }

        const hasCircle = el.getAttribute("data-circle") === "true";
        points.push({ x, y, circle: hasCircle });
    });

    // 3. Generate a strict rectangular/orthogonal grid vertex array
    const vertices = [];
    vertices.push({ x: points[0].x, y: points[0].y });

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];

        if (i === 1) {
            if (prev.x !== curr.x) {
                vertices.push({ x: curr.x, y: prev.y });
            }
        } else {
            const midY = (prev.y + curr.y) / 2;
            if (prev.x !== curr.x) {
                vertices.push({ x: prev.x, y: midY });
                vertices.push({ x: curr.x, y: midY });
            }
        }
        vertices.push({ x: curr.x, y: curr.y });
    }

    // ==========================================
    // 🛠️ FIX FOR THE FINAL OFF-SCREEN TURN
    // ==========================================
    const lastPoint = points[points.length - 1];

    if (FINAL_DROP > 0) {
        // If there's a drop down before turning left:
        const cornerY = lastPoint.y + FINAL_DROP;
        vertices.push({ x: lastPoint.x, y: cornerY }); // Turn point
        vertices.push({ x: -1000, y: cornerY });       // Exit off-screen
    } else {
        // If turning left directly from the last anchor:
        vertices.push({ x: -1000, y: lastPoint.y });   // Exit off-screen
    }

    // 4. Trace vertices and inject controlled rounded curves at sharp intersections
    let pathString = `M ${vertices[0].x} ${vertices[0].y}`;

    for (let i = 1; i < vertices.length - 1; i++) {
        const pPrev = vertices[i - 1];
        const pCurr = vertices[i];
        const pNext = vertices[i + 1];

        const len1 = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
        const len2 = Math.hypot(pNext.x - pCurr.x, pNext.y - pCurr.y);

        const actualR = Math.min(CORNER_RADIUS, len1 / 2, len2 / 2);
        const isCorner = (pPrev.x !== pNext.x) && (pPrev.y !== pNext.y);

        if (actualR > 0 && isCorner) {
            const dirX1 = Math.sign(pCurr.x - pPrev.x);
            const dirY1 = Math.sign(pCurr.y - pPrev.y);
            const ax = pCurr.x - dirX1 * actualR;
            const ay = pCurr.y - dirY1 * actualR;

            const dirX2 = Math.sign(pNext.x - pCurr.x);
            const dirY2 = Math.sign(pNext.y - pCurr.y);
            const bx = pCurr.x + dirX2 * actualR;
            const by = pCurr.y + dirY2 * actualR;

            pathString += ` L ${ax} ${ay} Q ${pCurr.x} ${pCurr.y} ${bx} ${by}`;
        } else {
            pathString += ` L ${pCurr.x} ${pCurr.y}`;
        }
    }

    // Seal the vector path out off-screen
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





// Quotes Carousel

document.querySelectorAll('[data-quotes-carousel]').forEach((carousel) => {
  const slidesContainer = carousel.querySelector('.quotes__slides');
  const slides = carousel.querySelectorAll('.quotes__slide');
  const dots = carousel.querySelectorAll('.quotes__dot');
  const previousButton = carousel.querySelector('[data-quotes-prev]');
  const nextButton = carousel.querySelector('[data-quotes-next]');

  if (!slides.length) {
    return;
  }

  let currentIndex = 0;
  let isAnimating = false;


  /*
   * --------------------------------
   * Automatically determine the height
   * of the tallest quote.
   * --------------------------------
   */

  function setSlidesHeight() {
    let tallestHeight = 0;

    slides.forEach((slide) => {
      const height = slide.scrollHeight;

      if (height > tallestHeight) {
        tallestHeight = height;
      }
    });

    slidesContainer.style.height = `${tallestHeight}px`;
  }


  /*
   * Measure after the page has rendered.
   * This makes sure fonts have been applied.
   */

    setSlidesHeight();

    if (document.fonts) {
    document.fonts.ready.then(setSlidesHeight);
    }


  /*
   * Recalculate when the browser changes size,
   * since text wrapping may change.
   */

  let resizeTimer;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      setSlidesHeight();
    }, 100);
  });


  /*
   * --------------------------------
   * Change slide
   * --------------------------------
   */

  function showSlide(newIndex, direction) {
    if (isAnimating || newIndex === currentIndex) {
      return;
    }

    isAnimating = true;

    const currentSlide = slides[currentIndex];
    const nextSlide = slides[newIndex];

    const enterClass =
      direction === 'next'
        ? 'is-entering-right'
        : 'is-entering-left';

    const leaveClass =
      direction === 'next'
        ? 'is-leaving-left'
        : 'is-leaving-right';


    /*
     * Put the new slide in its starting position.
     */

    nextSlide.classList.add(enterClass);
    nextSlide.classList.add('is-active');


    /*
     * Force the browser to register the
     * starting position before animating.
     */

    requestAnimationFrame(() => {
      currentSlide.classList.add(leaveClass);
      nextSlide.classList.remove(enterClass);

      dots[currentIndex]?.classList.remove('is-active');
      dots[newIndex]?.classList.add('is-active');

      currentIndex = newIndex;
    });


    /*
     * Clean up after the animation.
     */

    setTimeout(() => {
      slides.forEach((slide, index) => {
        if (index !== currentIndex) {
          slide.classList.remove(
            'is-active',
            'is-entering-left',
            'is-entering-right',
            'is-leaving-left',
            'is-leaving-right'
          );
        }
      });

      isAnimating = false;
    }, 450);
  }


  /*
   * --------------------------------
   * Previous / next buttons
   * --------------------------------
   */

  previousButton?.addEventListener('click', () => {
    const newIndex =
      (currentIndex - 1 + slides.length) % slides.length;

    showSlide(newIndex, 'previous');
  });


  nextButton?.addEventListener('click', () => {
    const newIndex =
      (currentIndex + 1) % slides.length;

    showSlide(newIndex, 'next');
  });


  /*
   * --------------------------------
   * Dots
   * --------------------------------
   */

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const newIndex = Number(dot.dataset.quotesDot);

      if (newIndex === currentIndex) {
        return;
      }

      const direction =
        newIndex > currentIndex
          ? 'next'
          : 'previous';

      showSlide(newIndex, direction);
    });
  });
});