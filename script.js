function initializeSite() {
    if (document.documentElement.dataset.siteInitialized === "true") return;
    document.documentElement.dataset.siteInitialized = "true";

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);
    try {
        document.documentElement.dataset.theme = localStorage.getItem("viteaTheme") === "light" ? "light" : "dark";
        document.body.classList.toggle("high-contrast", localStorage.getItem("viteaHighContrast") === "true");
        document.documentElement.classList.toggle("reduce-motion", localStorage.getItem("viteaReduceMotion") === "true");
    } catch (error) {
        console.error("Nu s-au putut aplica preferințele salvate la pornirea paginii.", error);
    }

    const loader = $("#loader");
    const loaderProgress = $("#loaderProgress");
    const loaderText = $("#loaderText");
    const skipLoader = $("#skipLoader");
    let loading = 0;
    let loaderFinished = false;

    function finishLoader() {
        if (loaderFinished) return;

        loaderFinished = true;
        loading = 100;

        if (loaderProgress) {
            loaderProgress.style.width = "100%";
        }

        if (loaderText) {
            loaderText.textContent = "Gata!";
        }

        setTimeout(() => {
            if (loader) {
                loader.classList.add("hidden");
            }
        }, 350);
    }

    function hideLoaderImmediately() {
        loaderFinished = true;
        loading = 100;

        if (loaderProgress) {
            loaderProgress.style.width = "100%";
        }

        if (loaderText) {
            loaderText.textContent = "Gata!";
        }

        if (loader) {
            loader.classList.add("hidden");
        }
    }

    function updateLoader() {
        if (loaderFinished) return;

        loading += Math.floor(Math.random() * 8) + 4;

        if (loading >= 100) {
            finishLoader();
            return;
        }

        if (loaderProgress) {
            loaderProgress.style.width = `${loading}%`;
        }

        if (loaderText) {
            loaderText.textContent = `Se încarcă... ${loading}%`;
        }

        setTimeout(updateLoader, 100);
    }

    const navigationEntry = performance.getEntriesByType("navigation")[0];
    const isBackForwardNavigation = navigationEntry?.type === "back_forward";

    if (isBackForwardNavigation) {
        hideLoaderImmediately();
    } else {
        if (skipLoader) {
            skipLoader.addEventListener("click", finishLoader);
        }
        setTimeout(updateLoader, 200);
    }
    window.setTimeout(hideLoaderImmediately, 2500);

    window.addEventListener("pageshow", (event) => {
        if (event.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
            hideLoaderImmediately();
        }
    });

    const visitReturnStatus = $("#visitReturnStatus");
    const visitDepartureStorageKey = "viteaVisitDepartureTime";

    function formatElapsedVisitTime(milliseconds) {
        const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");

        return `${hours} h ${minutes} min ${seconds} s`;
    }

    function recordVisitDeparture() {
        if (document.visibilityState !== "hidden") return;

        try {
            if (!localStorage.getItem(visitDepartureStorageKey)) {
                localStorage.setItem(visitDepartureStorageKey, String(Date.now()));
            }
        } catch (error) {
            console.error("Nu s-a putut salva ora plecării de pe site.", error);
        }
    }

    function showVisitReturn() {
        if (!visitReturnStatus) return;

        try {
            const savedDeparture = Number(localStorage.getItem(visitDepartureStorageKey));

            if (Number.isFinite(savedDeparture) && savedDeparture > 0 && savedDeparture <= Date.now()) {
                const returnedAt = Date.now();
                const departureTime = new Intl.DateTimeFormat("ro-RO", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }).format(new Date(savedDeparture));

                visitReturnStatus.textContent =
                    `Ai plecat la ${departureTime} și ai revenit după ${formatElapsedVisitTime(returnedAt - savedDeparture)}.`;
                localStorage.removeItem(visitDepartureStorageKey);
            } else if (localStorage.getItem(visitDepartureStorageKey)) {
                localStorage.removeItem(visitDepartureStorageKey);
                visitReturnStatus.textContent = "Ora plecării salvate nu era validă.";
            }
        } catch (error) {
            visitReturnStatus.textContent = "Timpul plecării nu este disponibil în acest browser.";
            console.error("Nu s-a putut citi timpul plecării de pe site.", error);
        }
    }

    showVisitReturn();
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            recordVisitDeparture();
        } else {
            showVisitReturn();
        }
    });
    window.addEventListener("pagehide", recordVisitDeparture);

    const newsGrid = $("#news .news-grid");
    const newsCards = Array.from($$("#news .news-card"));
    const newsSearch = $("#newsSearch");
    const newsCategory = $("#newsCategory");
    const newsSort = $("#newsSort");
    const newsFavoritesOnly = $("#newsFavoritesOnly");
    const newsStatus = $("#newsStatus");
    const favoritesStorageKey = "viteaFavoriteNews";

    function setNewsStatus(message) {
        if (newsStatus) {
            newsStatus.textContent = message;
        }
    }

    if (newsGrid && newsCards.length) {
        let favorites = new Set();
        let favoritesStorageAvailable = true;

        try {
            const savedFavorites = JSON.parse(localStorage.getItem(favoritesStorageKey) || "[]");
            if (!Array.isArray(savedFavorites)) {
                throw new TypeError("Lista de știri favorite are un format invalid.");
            }
            favorites = new Set(savedFavorites.filter((id) => newsCards.some((card) => card.id === id)));
        } catch (error) {
            favoritesStorageAvailable = false;
            setNewsStatus("Favoritele salvate nu au putut fi încărcate în acest browser.");
            console.error("Nu s-au putut încărca știrile favorite.", error);
        }

        const categories = new Map();
        newsCards.forEach((card) => {
            const category = card.dataset.category || "";
            if (category && !categories.has(category)) {
                categories.set(category, card.querySelector(".news-tag")?.textContent.trim() || category);
            }

            const favoriteButton = card.querySelector("[data-news-favorite]");
            if (favoriteButton) {
                const isFavorite = favorites.has(card.id);
                favoriteButton.setAttribute("aria-pressed", String(isFavorite));
                favoriteButton.querySelector("span").textContent = isFavorite
                    ? "Elimină din favorite"
                    : "Adaugă la favorite";
                favoriteButton.querySelector("i").className = isFavorite
                    ? "fa-solid fa-star"
                    : "fa-regular fa-star";
            }
        });

        categories.forEach((label, value) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            newsCategory?.appendChild(option);
        });

        function renderNews() {
            const query = normalizeSearch(newsSearch?.value.trim() || "");
            const category = newsCategory?.value || "all";
            const favoritesOnly = Boolean(newsFavoritesOnly?.checked);
            const sortDirection = newsSort?.value === "oldest" ? 1 : -1;

            const sortedCards = newsCards.slice().sort((first, second) => {
                const firstOrder = Number(first.dataset.publishedOrder) || 0;
                const secondOrder = Number(second.dataset.publishedOrder) || 0;
                return (firstOrder - secondOrder) * sortDirection;
            });

            sortedCards.forEach((card) => {
                const matchesQuery = !query || normalizeSearch(card.textContent).includes(query);
                const matchesCategory = category === "all" || card.dataset.category === category;
                const matchesFavorites = !favoritesOnly || favorites.has(card.id);
                card.hidden = !(matchesQuery && matchesCategory && matchesFavorites);
                newsGrid.appendChild(card);
            });

            const visibleCount = newsCards.filter((card) => !card.hidden).length;
            setNewsStatus(visibleCount
                ? `${visibleCount} ${visibleCount === 1 ? "știre afișată" : "știri afișate"}.`
                : "Nu a fost găsită nicio știre pentru filtrele selectate.");
        }

        function saveFavorites() {
            if (!favoritesStorageAvailable) {
                setNewsStatus("Favoritele sunt disponibile doar până închizi sau reîncarci pagina; stocarea browserului nu este accesibilă.");
                return;
            }

            try {
                localStorage.setItem(favoritesStorageKey, JSON.stringify(Array.from(favorites)));
            } catch (error) {
                favoritesStorageAvailable = false;
                console.error("Nu s-au putut salva știrile favorite.", error);
                setNewsStatus("Favorita a fost actualizată în pagină, dar nu a putut fi salvată în browser.");
            }
        }

        async function shareNews(card) {
            const url = new URL(window.location.href);
            url.hash = card.id;
            const title = card.querySelector("h3")?.textContent.trim() || "Știre";
            const shareData = { title, text: title, url: url.href };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                    setNewsStatus(`Linkul pentru ${title} a fost distribuit.`);
                    return;
                } catch (error) {
                    if (error.name === "AbortError") return;
                    console.error("Distribuirea nativă a eșuat; încerc copierea linkului.", error);
                }
            }

            try {
                if (!navigator.clipboard?.writeText) {
                    throw new Error("Clipboardul nu este disponibil în acest browser.");
                }
                await navigator.clipboard.writeText(url.href);
                setNewsStatus(`Linkul pentru ${title} a fost copiat.`);
            } catch (error) {
                console.error("Nu s-a putut copia linkul știrii.", error);
                try {
                    window.prompt("Copiază linkul știrii:", url.href);
                    setNewsStatus(`Linkul știrii este pregătit pentru copiere: ${url.href}`);
                } catch (promptError) {
                    console.error("Nu s-a putut afișa linkul pentru copiere.", promptError);
                    setNewsStatus(`Nu s-a putut distribui automat. Copiază acest link: ${url.href}`);
                }
            }
        }

        newsCards.forEach((card) => {
            card.querySelector("[data-news-favorite]")?.addEventListener("click", (event) => {
                const button = event.currentTarget;
                const isFavorite = favorites.has(card.id);

                if (isFavorite) {
                    favorites.delete(card.id);
                } else {
                    favorites.add(card.id);
                }

                button.setAttribute("aria-pressed", String(!isFavorite));
                button.querySelector("span").textContent = isFavorite
                    ? "Adaugă la favorite"
                    : "Elimină din favorite";
                button.querySelector("i").className = isFavorite
                    ? "fa-regular fa-star"
                    : "fa-solid fa-star";
                saveFavorites();
                renderNews();
                if (!favoritesStorageAvailable) {
                    setNewsStatus("Favoritele sunt disponibile doar până închizi sau reîncarci pagina; stocarea browserului nu este accesibilă.");
                }
            });

            card.querySelector("[data-news-share]")?.addEventListener("click", () => shareNews(card));
        });

        newsSearch?.addEventListener("input", renderNews);
        newsCategory?.addEventListener("change", renderNews);
        newsSort?.addEventListener("change", renderNews);
        newsFavoritesOnly?.addEventListener("change", renderNews);
        renderNews();
        if (!favoritesStorageAvailable) {
            setNewsStatus("Favoritele salvate nu au putut fi încărcate; verifică setările de stocare ale browserului.");
        }
    }

    $$(".news-transcript").forEach((transcript) => {
        const summary = transcript.querySelector("summary");
        const content = transcript.querySelector("p");
        const hasText = content?.textContent.trim();

        if (!hasText && summary) {
            summary.textContent = "Text indisponibil";
            summary.setAttribute("aria-disabled", "true");
            summary.addEventListener("click", (event) => event.preventDefault());
        }

        transcript.addEventListener("toggle", () => {
            if (!transcript.open) return;

            if (!hasText) {
                transcript.open = false;
                return;
            }

            $$(".news-transcript").forEach((otherTranscript) => {
                if (otherTranscript !== transcript) {
                    otherTranscript.open = false;
                }
            });
        });
    });

    /* LOADER */

    /* HAMBURGER */

    const hamburger = $("#hamburger");
    const sideMenu = $("#sideMenu");
    const menuOverlay = $("#menuOverlay");

    function openMenu() {
        sideMenu.classList.add("open");
        menuOverlay.classList.add("show");
        document.body.classList.add("menu-open", "mobile-menu-chrome-hidden");
    }

    function closeSideMenu() {
        sideMenu.classList.remove("open", "is-dragging");
        sideMenu.style.transform = "";
        menuOverlay.classList.remove("show");
        document.body.classList.remove("menu-open", "mobile-menu-chrome-hidden");
    }

    let menuSwipeStart = null;
    let menuSwipeDelta = 0;

    sideMenu?.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch" || !sideMenu.classList.contains("open")) return;

        menuSwipeStart = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY
        };
        menuSwipeDelta = 0;
    });

    sideMenu?.addEventListener("pointermove", (event) => {
        if (!menuSwipeStart || event.pointerId !== menuSwipeStart.pointerId) return;

        const deltaX = event.clientX - menuSwipeStart.x;
        const deltaY = event.clientY - menuSwipeStart.y;

        if (deltaX >= 0 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

        menuSwipeDelta = deltaX;
        sideMenu.classList.add("is-dragging");
        sideMenu.style.transform = `translateX(${deltaX}px)`;
    });

    function finishMenuSwipe(event) {
        if (!menuSwipeStart || event.pointerId !== menuSwipeStart.pointerId) return;

        const shouldClose = menuSwipeDelta < -Math.min(90, sideMenu.clientWidth * 0.28);
        menuSwipeStart = null;
        menuSwipeDelta = 0;

        if (shouldClose) {
            closeSideMenu();
            return;
        }

        sideMenu.classList.remove("is-dragging");
        sideMenu.style.transform = "";
    }

    sideMenu?.addEventListener("pointerup", finishMenuSwipe);
    sideMenu?.addEventListener("pointercancel", finishMenuSwipe);
    hamburger?.addEventListener("click", openMenu);
    menuOverlay?.addEventListener("click", closeSideMenu);

    /* SECTION NAVIGATION */

    const currentPage = window.location.pathname.split("/").pop().toLowerCase() || "index.html";
    document.querySelectorAll(".desktop-navigation a, .bottom-navigation a").forEach((link) => {
        const linkPage = (link.getAttribute("href") || "").toLowerCase();
        const isActive = linkPage === currentPage || (currentPage === "" && linkPage === "index.html");
        link.classList.toggle("active", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
    });

    function goToSection(sectionId) {
        const section = document.getElementById(sectionId);

        if (!section) return;

        section.scrollIntoView({ behavior: "smooth", block: "start" });
        closeSideMenu();
    }

    $$("[data-section]").forEach((button) => {
        button.addEventListener("click", () => {
            const section = button.dataset.section;

            goToSection(section);
            markHalloweenQuest(section);
            setCurrentSection(section);
        });
    });

    /* SCROLL CONTROLS */

    function scrollTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function scrollBottom() {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    }

    let previousScrollY = window.scrollY;
    let scrollUpdatePending = false;

    function updateChromeForScroll() {
        const currentScrollY = window.scrollY;
        const scrollDifference = currentScrollY - previousScrollY;

        if (currentScrollY < 48) {
            document.body.classList.remove("scroll-chrome-hidden");
        } else if (scrollDifference > 7) {
            document.body.classList.add("scroll-chrome-hidden");
        } else if (scrollDifference < -7) {
            document.body.classList.remove("scroll-chrome-hidden");
        }

        previousScrollY = currentScrollY;
        scrollUpdatePending = false;
    }

    window.addEventListener("scroll", () => {
        if (scrollUpdatePending) return;

        scrollUpdatePending = true;
        window.requestAnimationFrame(updateChromeForScroll);
    }, { passive: true });

    $("#scrollTopBtn")?.addEventListener("click", scrollTop);
    $("#scrollBottomBtn")?.addEventListener("click", scrollBottom);

    /* MODALS */

    function syncModalState() {
        const hasOpenModal = Boolean(document.querySelector(".modal.show"));
        const isDesktop = window.matchMedia("(min-width: 701px)").matches;

        document.body.classList.toggle("modal-controls-hidden", hasOpenModal && isDesktop);
        document.body.classList.toggle("modal-chrome-hidden", hasOpenModal);

        if (hasOpenModal) {
            document.body.classList.add("menu-open");
        } else {
            document.body.classList.remove("menu-open");
        }
    }

    function openModal(id) {

        const modal = document.getElementById(id);

        if (!modal) return;

        modal.classList.add("show");

        if (id === "updatesModal") {
            markUpdatesAsRead();
        }

        syncModalState();
    }

    function closeModal(id) {

        const modal = document.getElementById(id);

        if (!modal) return;

        if (id === "searchModal" && voiceSearchActive && speechRecognition) {
            setVoiceSearchActive(false);
            speechRecognition.stop();
        }

        modal.classList.remove("show");

        syncModalState();
    }

    $$("[data-close]").forEach((button) => {

        button.addEventListener("click", () => {
            closeModal(button.dataset.close);
        });

    });

    document.addEventListener("keydown", (event) => {
        if (!sideMenu?.classList.contains("open")) return;

        const isSpace = event.code === "Space" || event.key === " ";

        if (isSpace || event.key === "Escape") {
            if (isSpace) event.preventDefault();
            closeSideMenu();
        }
    });

    window.addEventListener("resize", syncModalState);

    /* DESKTOP CONTROLS */

    $("#notesBtn")?.addEventListener("click", () => {
        openModal("notesModal");
    });

    $("#updatesBtn")?.addEventListener("click", () => {
        openModal("updatesModal");
        markUpdatesAsRead();
    });

    $("#settingsBtn")?.addEventListener("click", () => {
        openModal("settingsModal");
    });

    $("#pointsBtn")?.addEventListener("click", () => {
        openModal("pointsModal");
    });

    $("#fortuneWheelBtn")?.addEventListener("click", () => {
        openModal("fortuneWheelModal");
    });

    $("#questionBtn")?.addEventListener("click", () => {
        openModal("quickFunctionsModal");
    });

    function setupControlToggle(toggleId, toolsId, side) {
        const toggle = document.getElementById(toggleId);
        const tools = document.getElementById(toolsId);
        const icon = toggle?.querySelector("i");

        if (!toggle || !tools || !icon) return;

        toggle.addEventListener("click", () => {
            const collapsed = toggle.getAttribute("aria-expanded") === "true";
            const action = collapsed ? "Arată" : "Ascunde";

            toggle.setAttribute("aria-expanded", String(!collapsed));
            toggle.setAttribute("aria-label", `${action} controalele din ${side}`);
            toggle.title = `${action} controalele din ${side}`;
            tools.setAttribute("aria-hidden", String(collapsed));
            tools.inert = collapsed;
            toggle.parentElement.classList.toggle("is-collapsed", collapsed);
            const iconDirection = side === "stânga"
                ? (collapsed ? "fa-chevron-right" : "fa-chevron-left")
                : (collapsed ? "fa-chevron-left" : "fa-chevron-right");
            icon.className = `fa-solid ${iconDirection}`;
        });
    }

    setupControlToggle("rightControlsToggle", "rightControlTools", "dreapta");

    const halloweenDialog = $("#halloweenEventDialog");
    const halloweenStorageKey = "viteaHalloweenEventProgress";
    const halloweenDefaults = { candy: 0, visited: [], claimed: [], rewards: [], active: {}, boosterUntil: 0, firstVisitAt: Date.now(), lastCandyMinuteAt: Date.now(), completedActions: [], activeSeconds: 0 };
    let halloweenProgress = halloweenDefaults;

    try {
        halloweenProgress = { ...halloweenDefaults, ...JSON.parse(localStorage.getItem(halloweenStorageKey) || "{}") };
        halloweenProgress.visited ||= [];
        halloweenProgress.claimed ||= [];
        halloweenProgress.rewards ||= [];
        halloweenProgress.completedActions ||= [];
        halloweenProgress.activeSeconds ||= 0;
        halloweenProgress.active ||= {};
        halloweenProgress.firstVisitAt ||= Date.now();
        halloweenProgress.lastCandyMinuteAt ||= Date.now();
        halloweenProgress.eventEndsAt ||= Date.now() + 14 * 24 * 60 * 60 * 1000;
    } catch (error) {
        halloweenProgress = { ...halloweenDefaults };
    }

    function saveHalloweenProgress() {
        try { localStorage.setItem(halloweenStorageKey, JSON.stringify(halloweenProgress)); } catch (error) {}
    }

    function refreshHalloweenPanel() {
        document.body.classList.toggle("halloween-man-owned", halloweenProgress.rewards.includes("Halloween Man"));
        document.body.classList.toggle("halloween-owned-background", halloweenProgress.active?.["Fundal Halloween"] === true);
        document.body.classList.toggle("halloween-purple-buttons", halloweenProgress.active?.["Îmbrăcăminte violetă"] === true);
        document.body.classList.toggle("halloween-happy-pumpkin", halloweenProgress.active?.["Balonul magic"] === true);
        document.querySelectorAll(".brand-icon").forEach((icon) => icon.textContent = halloweenProgress.active?.["Iconiță Halloween"] === true ? "🎃" : "V");
        toggleHalloweenPumpkin(halloweenProgress.active?.["Dovleac pe cap"] === true);
        const candyCount = $("#halloweenCandyCount");
        if (candyCount) candyCount.textContent = halloweenProgress.candy;

        const questRewards = { time5: 20, settings: 10, purchase: 30, time20: 40, contact: 30, accessories3: 200, hanganuName: 120, time60: 300, nichitaNote: 150, time30: 250 };
        $$('[data-quest-action]').forEach((button) => {
            const quest = button.dataset.questAction;
            const completed = halloweenProgress.claimed.includes(quest);
            const elapsedMinutes = Math.floor((halloweenProgress.activeSeconds || 0) / 60);
            const ready = quest === "time5" ? elapsedMinutes >= 5
                : quest === "time20" ? elapsedMinutes >= 20
                : quest === "time30" ? elapsedMinutes >= 30
                : quest === "time60" ? elapsedMinutes >= 60
                : halloweenProgress.completedActions?.includes(quest);
            button.disabled = completed || !ready;
            button.classList.toggle("completed", completed);
            button.textContent = completed ? "Finalizat ✓" : (ready ? `Revendică +${questRewards[quest]} 🍬` : `+${questRewards[quest]} 🍬`);
            const progress = document.querySelector(`[data-quest-progress="${quest}"]`);
            const requiredMinutes = quest === "time60" ? 60 : quest === "time30" ? 30 : quest === "time20" ? 20 : quest === "time5" ? 5 : 0;
            if (progress) progress.textContent = `${Math.min(elapsedMinutes, requiredMinutes)}/${requiredMinutes} minute`;
        });

        $$('[data-buy-reward]').forEach((button) => {
            const owned = halloweenProgress.rewards.includes(button.dataset.buyReward);
            button.disabled = owned;
            button.classList.toggle("owned", owned);
            button.textContent = owned ? "Obținut ✓" : `${button.dataset.cost} 🍬`;
        });

        const ownedCount = halloweenProgress.rewards.length;
        renderHalloweenInventory();
        const collectionCount = $("#halloweenCollectionProgress");
        const collectionBar = $("#halloweenCollectionBar");
        if (collectionCount) collectionCount.textContent = `${ownedCount}/12 recompense`;
        if (collectionBar) collectionBar.style.width = `${Math.min(100, ownedCount / 12 * 100)}%`;
    }

    function renderHalloweenInventory() {
        const itemData = {
            "Lucky Booster": { category: "boosts", icon: "🍀", action: "Folosește 24h" },
            "Foarte Lucky Booster": { category: "boosts", icon: "🎯", action: "Folosește garantat" },
            "Fundal Halloween": { category: "accessories", icon: "🖼️", action: "Folosește" },
            "Muzică Halloween": { category: "music", icon: "🎵", action: "Pornește" },
            "Sunet Halloween": { category: "sounds", icon: "🔊", action: "Folosește" },
            "Iconiță Halloween": { category: "accessories", icon: "🎃", action: "Folosește" },
            "Screamer Monster": { category: "boosts", icon: "👾", action: "Vezi screamer" },
            "Dovleac pe cap": { category: "accessories", icon: "🎃", action: "Folosește" },
            "Balonul magic": { category: "accessories", icon: "🎈", action: "Sparge balonul" },
            "Îmbrăcăminte violetă": { category: "accessories", icon: "👕", action: "Folosește" },
            "Nume pentru Hanganu": { category: "accessories", icon: "👻", action: "Alege un nume" },
            "Halloween Man": { category: "accessories", icon: "🦇", action: "Deschide comenzi" }
        };
        Object.values({ accessories: "accessories", boosts: "boosts", sounds: "sounds", music: "music" }).forEach((category) => {
            const panel = document.querySelector(`[data-inventory-panel="${category}"]`);
            if (!panel) return;
            const items = halloweenProgress.rewards.filter((reward) => itemData[reward]?.category === category);
            if (!items.length) {
                panel.innerHTML = `<div class="inventory-empty"><span>${category === "music" ? "🎵" : category === "boosts" ? "⚡" : category === "sounds" ? "🔊" : "🎃"}</span><h3>${category === "music" ? "Muzică" : category === "boosts" ? "Boosturi" : category === "sounds" ? "Sunet" : "Accesorii"}</h3><p>Obiectele Halloween cumpărate vor apărea aici.</p></div>`;
                return;
            }
            panel.innerHTML = items.map((reward) => {
                const active = halloweenProgress.active?.[reward] === true;
                    const action = reward === "Lucky Booster" && halloweenProgress.boosterUntil > Date.now()
                        ? "Activ 24h ✓"
                        : reward === "Balonul magic" && halloweenProgress.balloonPopped
                            ? "Balon spart ✓"
                            : itemData[reward].action;
                return `<article class="inventory-item"><span>${itemData[reward].icon}</span><div><strong>${reward}</strong><small>${reward === "Lucky Booster" ? "Șansă +80% la rezultate pozitive" : "Halloween cosmetic / efect"}</small></div><button type="button" data-inventory-use="${reward}" class="${active ? "active" : ""}">${active ? "Dezactivează" : action}</button></article>`;
            }).join("");
        });
        bindInventoryActions();
    }

    function bindInventoryActions() {
        $$('[data-inventory-use]').forEach((button) => {
            button.onclick = () => useHalloweenItem(button.dataset.inventoryUse);
        });
    }

    function useHalloweenItem(reward) {
        halloweenProgress.active ||= {};
        if (reward === "Lucky Booster") {
            halloweenProgress.boosterUntil = Date.now() + 24 * 60 * 60 * 1000;
            showToast("🍀", "Lucky Booster activat pentru 24 de ore!");
        } else if (reward === "Foarte Lucky Booster") {
            halloweenProgress.boosterUntil = Date.now() + 24 * 60 * 60 * 1000;
            halloweenProgress.guaranteedLuckyUntil = Date.now() + 24 * 60 * 60 * 1000;
            showToast("🎯", "Foarte Lucky Booster: rezultat garantat pentru 24 de ore!");
        } else if (reward === "Balonul magic") {
            if (halloweenProgress.balloonPopped) return;
            halloweenProgress.balloonPopped = true;
            halloweenProgress.candy += 10;
            halloweenProgress.boosterUntil = Date.now() + 24 * 60 * 60 * 1000;
            halloweenProgress.active[reward] = true;
            document.body.classList.add("halloween-happy-pumpkin");
            playMagicBalloon();
            showToast("🎈", "Balonul s-a spart: +10 bomboane, Lucky Booster și dovleac vesel!");
        } else if (reward === "Îmbrăcăminte violetă") {
            halloweenProgress.active[reward] = !halloweenProgress.active[reward];
            document.body.classList.toggle("halloween-purple-buttons", halloweenProgress.active[reward]);
            showToast("👕", halloweenProgress.active[reward] ? "Îmbrăcămintea violetă este activată." : "Bordura violetă a fost dezactivată.");
        } else if (reward === "Halloween Man") {
            openHalloweenManPanel();
        } else if (reward === "Nume pentru Hanganu") {
            showHalloweenNamePicker();
        } else if (reward === "Fundal Halloween") {
            halloweenProgress.active[reward] = !halloweenProgress.active[reward];
            document.body.classList.toggle("halloween-owned-background", halloweenProgress.active[reward]);
            showToast("🖼️", halloweenProgress.active[reward] ? "Fundalul Halloween este activ." : "Fundalul obișnuit este restaurat.");
        } else if (reward === "Iconiță Halloween") {
            halloweenProgress.active[reward] = !halloweenProgress.active[reward];
            document.querySelectorAll(".brand-icon").forEach((icon) => icon.textContent = halloweenProgress.active[reward] ? "🎃" : "V");
            showToast("🎃", halloweenProgress.active[reward] ? "Iconița Halloween este activă." : "Iconița originală este restaurată.");
        } else if (reward === "Sunet Halloween") {
            halloweenProgress.active[reward] = !halloweenProgress.active[reward];
            playHalloweenClickSound();
            showToast("🔊", halloweenProgress.active[reward] ? "Sunetul Halloween este activ." : "Sunetul Halloween este oprit.");
        } else if (reward === "Muzică Halloween") {
            halloweenProgress.active[reward] = !halloweenProgress.active[reward];
            toggleHalloweenMusic(halloweenProgress.active[reward]);
            showToast("🎵", halloweenProgress.active[reward] ? "Muzica Halloween este pornită." : "Muzica Halloween este oprită.");
        } else if (reward === "Screamer Monster") {
            playHalloweenScreamer();
        } else if (reward === "Dovleac pe cap") {
            halloweenProgress.active[reward] = !halloweenProgress.active[reward];
            toggleHalloweenPumpkin(halloweenProgress.active[reward]);
            showToast("🎃", halloweenProgress.active[reward] ? "Dovleacul este pe ecran." : "Dovleacul a fost scos.");
        }
        saveHalloweenProgress();
        refreshHalloweenPanel();
    }

    function playMagicBalloon() {
        const balloon = document.createElement("div");
        balloon.className = "magic-balloon-pop";
        balloon.textContent = "🎈";
        document.body.appendChild(balloon);
        for (let index = 0; index < 18; index += 1) {
            const particle = document.createElement("span");
            particle.style.setProperty("--x", `${Math.round(Math.random() * 220 - 110)}px`);
            particle.style.setProperty("--y", `${Math.round(Math.random() * -180 - 30)}px`);
            particle.style.animationDelay = `${Math.random() * 0.12}s`;
            balloon.appendChild(particle);
        }
        window.setTimeout(() => balloon.remove(), 1800);
    }

    function showHalloweenNamePicker() {
        const existing = $(".halloween-name-picker");
        if (existing) {
            existing.classList.toggle("is-visible");
            return;
        }
        const picker = document.createElement("div");
        picker.className = "halloween-name-picker is-visible";
        picker.innerHTML = `
            <strong>Alege un nume pentru Hanganu</strong>
            <div>
                ${["proasta", "nenormala", "concenoia", "imbitalca", "sarpe", "witch"].map((name) => `<button type="button" data-halloween-name="${name}">${name}</button>`).join("")}
            </div>
        `;
        document.body.appendChild(picker);
        picker.querySelectorAll("[data-halloween-name]").forEach((button) => {
            button.addEventListener("click", () => showHanganuName(button.dataset.halloweenName, picker));
        });
    }

    function showHanganuName(name, picker) {
        const animation = document.createElement("div");
        animation.className = "hanganu-name-animation";
        animation.innerHTML = `<span>Hanganu</span><strong>${name}</strong>`;
        document.body.appendChild(animation);
        picker.classList.remove("is-visible");
        window.setTimeout(() => animation.remove(), 2800);
        halloweenProgress.completedActions ||= [];
        if (!halloweenProgress.completedActions.includes("hanganuName")) halloweenProgress.completedActions.push("hanganuName");
        saveHalloweenProgress();
        refreshHalloweenPanel();
    }

    function playHalloweenScreamer() {
        const screamer = $("#halloweenScreamer");
        if (!screamer) return;
        screamer.classList.add("is-visible");
        screamer.setAttribute("aria-hidden", "false");
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            const context = new AudioContextClass();
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = "sawtooth";
            oscillator.frequency.setValueAtTime(850, context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(55, context.currentTime + 0.75);
            gain.gain.setValueAtTime(0.28, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.82);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.85);
            setTimeout(() => context.close(), 950);
        }
        setTimeout(() => {
            screamer.classList.remove("is-visible");
            screamer.setAttribute("aria-hidden", "true");
        }, 850);
    }

    function toggleHalloweenPumpkin(enabled) {
        $("#halloweenPumpkinHead")?.classList.toggle("is-visible", enabled);
        $("#halloweenPumpkinHead")?.setAttribute("aria-hidden", String(!enabled));
    }

    $("#removePumpkinHead")?.addEventListener("click", () => {
        halloweenProgress.active ||= {};
        halloweenProgress.active["Dovleac pe cap"] = false;
        toggleHalloweenPumpkin(false);
        saveHalloweenProgress();
        refreshHalloweenPanel();
    });

    let halloweenMusicContext;
    let halloweenMusicTimer;
    function toggleHalloweenMusic(enabled) {
        clearInterval(halloweenMusicTimer);
        halloweenMusicContext?.close();
        halloweenMusicContext = null;
        if (!enabled) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        halloweenMusicContext = new AudioContextClass();
        const notes = [220, 196, 174, 196, 220, 261, 246, 196];
        let step = 0;
        halloweenMusicTimer = setInterval(() => {
            const oscillator = halloweenMusicContext.createOscillator();
            const gain = halloweenMusicContext.createGain();
            oscillator.type = "triangle";
            oscillator.frequency.value = notes[step++ % notes.length];
            gain.gain.setValueAtTime(0.055, halloweenMusicContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, halloweenMusicContext.currentTime + 0.6);
            oscillator.connect(gain).connect(halloweenMusicContext.destination);
            oscillator.start();
            oscillator.stop(halloweenMusicContext.currentTime + 0.62);
        }, 650);
    }

    function playHalloweenClickSound() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass || halloweenProgress.active?.["Sunet Halloween"] !== true) return;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(520, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(180, context.currentTime + 0.18);
        gain.gain.setValueAtTime(0.06, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.21);
        setTimeout(() => context.close(), 300);
    }

    document.addEventListener("pointerdown", () => {
        if (halloweenProgress.active?.["Sunet Halloween"] === true) playHalloweenClickSound();
    });

    function createHalloweenTouchEffect(target, event) {
        const halloweenTarget = target.closest(
            "[data-quest-action], [data-inventory-use], [data-buy-reward], .halloween-game-card button, .halloween-game-card input"
        );
        if (!halloweenTarget) return;

        const rect = halloweenTarget.getBoundingClientRect();
        const x = Number.isFinite(event.clientX) ? event.clientX : rect.left + rect.width / 2;
        const y = Number.isFinite(event.clientY) ? event.clientY : rect.top + rect.height / 2;

        const ring = document.createElement("span");
        ring.className = "halloween-touch-ring";
        ring.style.left = `${x}px`;
        ring.style.top = `${y}px`;
        document.body.appendChild(ring);
        window.setTimeout(() => ring.remove(), 650);

        halloweenTarget.classList.remove("halloween-touch-pop");
        void halloweenTarget.offsetWidth;
        halloweenTarget.classList.add("halloween-touch-pop");
        window.setTimeout(() => halloweenTarget.classList.remove("halloween-touch-pop"), 380);

        const symbols = ["🎃", "🍬", "✦"];
        for (let index = 0; index < 7; index += 1) {
            const particle = document.createElement("span");
            particle.className = "halloween-touch-particle";
            particle.textContent = symbols[index % symbols.length];
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.setProperty("--touch-x", `${Math.round(Math.cos(index / 7 * Math.PI * 2) * (38 + index * 3))}px`);
            particle.style.setProperty("--touch-y", `${Math.round(Math.sin(index / 7 * Math.PI * 2) * (38 + index * 3))}px`);
            particle.style.setProperty("--touch-delay", `${index * 18}ms`);
            document.body.appendChild(particle);
            window.setTimeout(() => particle.remove(), 750);
        }
    }

    document.addEventListener("pointerdown", (event) => {
        createHalloweenTouchEffect(event.target, event);
    }, { passive: true });

    function markHalloweenQuest(section) {
        if (!["home", "news", "info", "contact"].includes(section)) return;
        if (!halloweenProgress.visited.includes(section)) halloweenProgress.visited.push(section);
        saveHalloweenProgress();
        refreshHalloweenPanel();
    }

    const halloweenInventoryDialog = $("#halloweenInventoryDialog");

    $("#halloweenInventoryBtn")?.addEventListener("click", () => {
        if (typeof halloweenInventoryDialog.showModal === "function") halloweenInventoryDialog.showModal();
        else halloweenInventoryDialog.setAttribute("open", "");
    });

    $("[data-inventory-close]")?.addEventListener("click", () => halloweenInventoryDialog.close());
    halloweenInventoryDialog?.addEventListener("click", (event) => {
        if (event.target === halloweenInventoryDialog) halloweenInventoryDialog.close();
    });

    const halloweenManName = "Halloween Man";
    if (!$("#halloweenManPanel")) {
        document.body.insertAdjacentHTML("beforeend", `
            <div id="halloweenManPanel" class="modal halloween-man-panel" role="dialog" aria-modal="true" aria-labelledby="halloweenManTitle">
                <div class="modal-content halloween-man-content">
                    <button type="button" class="modal-close halloween-man-close" aria-label="Închide">&times;</button>
                    <span class="halloween-man-icon">🦇</span>
                    <h2 id="halloweenManTitle">Halloween Man</h2>
                    <p>Folosește tastele sau butoanele pentru navigare rapidă.</p>
                    <div class="halloween-man-shortcuts">
                        <button type="button" data-halloween-action="home"><kbd>A</kbd><span>Acasă</span></button>
                        <button type="button" data-halloween-action="news"><kbd>S</kbd><span>Știri</span></button>
                        <button type="button" data-halloween-action="info"><kbd>I</kbd><span>Info</span></button>
                        <button type="button" data-halloween-action="contact"><kbd>C</kbd><span>Contact</span></button>
                        <button type="button" data-halloween-action="reviews"><kbd>⇧ C</kbd><span>Recenzii</span></button>
                        <button type="button" data-halloween-action="settings"><kbd>⇧ S</kbd><span>Setări</span></button>
                        <button type="button" data-halloween-action="notes"><kbd>N</kbd><span>Notițe</span></button>
                        <button type="button" data-halloween-action="updates"><kbd>NN</kbd><span>Notify Changes</span></button>
                        <button type="button" data-halloween-action="quick"><kbd>F</kbd><span>Funcții rapide</span></button>
                        <button type="button" data-halloween-action="wheel"><kbd>R</kbd><span>Roata norocului</span></button>
                        <button type="button" data-halloween-action="about"><kbd>D</kbd><span>Despre noi</span></button>
                        <button type="button" data-halloween-action="inventory"><kbd>⇧ I</kbd><span>Inventar</span></button>
                    </div>
                </div>
            </div>
        `);
    }

    if (!$("#halloweenManMobileToggle")) {
        document.body.insertAdjacentHTML("beforeend", `
            <button id="halloweenManMobileToggle" type="button" class="halloween-man-mobile-toggle" aria-label="Deschide Halloween Man">
                <span>⬆️</span><strong>🦇</strong><span>⬇️</span>
            </button>
        `);
    }

    function openHalloweenManPanel() {
        if (!halloweenProgress.rewards.includes(halloweenManName)) return;
        const panel = $("#halloweenManPanel");
        panel?.classList.add("open");
        panel?.querySelector(".halloween-man-close")?.focus();
    }

    function closeHalloweenManPanel() {
        $("#halloweenManPanel")?.classList.remove("open");
    }

    $("#halloweenManMobileToggle")?.addEventListener("click", openHalloweenManPanel);
    $(".halloween-man-close")?.addEventListener("click", closeHalloweenManPanel);
    $("#halloweenManPanel")?.addEventListener("click", (event) => {
        if (event.target === $("#halloweenManPanel")) closeHalloweenManPanel();
    });

    let lastNPress = 0;
    function runHalloweenManAction(action) {
        closeHalloweenManPanel();
        const actions = {
            home: () => { if (!location.pathname.toLowerCase().endsWith("/index.html")) location.href = "index.html"; window.scrollTo({ top: 0, behavior: "smooth" }); },
            news: () => location.pathname.toLowerCase().endsWith("/news.html") ? window.scrollTo({ top: 0, behavior: "smooth" }) : location.href = "news.html",
            info: () => location.pathname.toLowerCase().endsWith("/info.html") ? window.scrollTo({ top: 0, behavior: "smooth" }) : location.href = "info.html",
            contact: () => location.pathname.toLowerCase().endsWith("/contact.html") ? window.scrollTo({ top: 0, behavior: "smooth" }) : location.href = "contact.html",
            reviews: () => location.href = "contact.html#reviews",
            settings: () => document.getElementById("settingsBtn")?.click(),
            notes: () => document.getElementById("notesBtn")?.click(),
            updates: () => document.getElementById("updatesBtn")?.click(),
            quick: () => openModal("quickFunctionsModal"),
            wheel: () => document.getElementById("fortuneWheelBtn")?.click(),
            about: () => location.href = "about-site.html",
            inventory: () => document.getElementById("halloweenInventoryBtn")?.click()
        };
        actions[action]?.();
    }

    $$("[data-halloween-action]").forEach((button) => button.addEventListener("click", () => runHalloweenManAction(button.dataset.halloweenAction)));

    document.addEventListener("keydown", (event) => {
        if (!halloweenProgress.rewards.includes(halloweenManName)) return;
        if (event.ctrlKey || event.metaKey || event.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) || event.target.isContentEditable) return;

        const key = event.key.toLowerCase();
        if (key === "n") {
            const now = Date.now();
            if (now - lastNPress < 700) {
                runHalloweenManAction("updates");
            } else {
                window.setTimeout(() => {
                    if (Date.now() - lastNPress >= 700) runHalloweenManAction("notes");
                }, 700);
            }
            lastNPress = now;
            return;
        }
        if (key === "a") runHalloweenManAction("home");
        else if (key === "s") runHalloweenManAction(event.shiftKey ? "settings" : "news");
        else if (key === "i") runHalloweenManAction(event.shiftKey ? "inventory" : "info");
        else if (key === "c") runHalloweenManAction(event.shiftKey ? "reviews" : "contact");
        else if (key === "r") runHalloweenManAction("wheel");
        else if (key === "f") runHalloweenManAction("quick");
        else if (key === "n" && event.repeat) return;
        else if (key === "d") runHalloweenManAction("about");
    });

    $$('[data-inventory-tab]').forEach((tab) => {
        tab.addEventListener("click", () => {
            $$('[data-inventory-tab]').forEach((item) => {
                const active = item === tab;
                item.classList.toggle("active", active);
                item.setAttribute("aria-selected", String(active));
            });
            $$('[data-inventory-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.inventoryPanel === tab.dataset.inventoryTab));
        });
    });

    $("#settingsBtn")?.addEventListener("click", () => {
        halloweenProgress.completedActions ||= [];
        if (!halloweenProgress.completedActions.includes("settings")) halloweenProgress.completedActions.push("settings");
        saveHalloweenProgress();
        refreshHalloweenPanel();
    });

    $("#halloweenShopBtn")?.addEventListener("click", () => {
        refreshHalloweenPanel();
        if (typeof halloweenDialog.showModal === "function") halloweenDialog.showModal();
        else halloweenDialog.setAttribute("open", "");
        halloweenDialog.classList.remove("is-closing");
        halloweenDialog.classList.add("is-opening");
        window.setTimeout(() => halloweenDialog.classList.remove("is-opening"), 520);
    });

    const closeHalloweenDialog = () => {
        if (!halloweenDialog || !halloweenDialog.open) return;
        halloweenDialog.classList.remove("is-opening");
        halloweenDialog.classList.add("is-closing");
        window.setTimeout(() => {
            halloweenDialog.close();
            halloweenDialog.classList.remove("is-closing");
        }, 260);
    };

    $("[data-halloween-close]")?.addEventListener("click", closeHalloweenDialog);
    halloweenDialog?.addEventListener("click", (event) => {
        if (event.target === halloweenDialog) closeHalloweenDialog();
    });
    halloweenDialog?.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeHalloweenDialog();
    });

    $$('[data-halloween-tab]').forEach((tab) => {
        tab.addEventListener("click", () => {
            $$('[data-halloween-tab]').forEach((item) => {
                const active = item === tab;
                item.classList.toggle("active", active);
                item.setAttribute("aria-selected", String(active));
            });
            const activePanel = [...$$('[data-halloween-panel]')].find((panel) => panel.dataset.halloweenPanel === tab.dataset.halloweenTab);
            $$('[data-halloween-panel]').forEach((panel) => {
                panel.classList.remove("active", "tab-enter-left", "tab-enter-right");
            });
            activePanel?.classList.add("active", "tab-enter-right");
            window.setTimeout(() => activePanel?.classList.remove("tab-enter-right"), 320);
        });
    });

    $$('[data-quest-action]').forEach((button) => {
        button.addEventListener("click", () => {
            const quest = button.dataset.questAction;
            if (halloweenProgress.claimed.includes(quest)) return;
            const elapsedMinutes = Math.floor((halloweenProgress.activeSeconds || 0) / 60);
            const ready = quest === "time5" ? elapsedMinutes >= 5
                : quest === "time20" ? elapsedMinutes >= 20
                : quest === "time30" ? elapsedMinutes >= 30
                : quest === "time60" ? elapsedMinutes >= 60
                : halloweenProgress.completedActions?.includes(quest);
            if (!ready) return;
            const rewards = { time5: 20, settings: 10, purchase: 30, time20: 40, contact: 30, accessories3: 200, hanganuName: 120, time60: 300, nichitaNote: 150, time30: 250 };
            halloweenProgress.candy += rewards[quest];
            halloweenProgress.claimed.push(quest);
            saveHalloweenProgress();
            refreshHalloweenPanel();
            showToast("🍬", `Ai primit ${rewards[quest]} bomboane!`);
        });
    });

    const purchaseDescriptions = {
        "Lucky Booster": "Activează șansa bonus de 80% pentru rezultate pozitive la Roata Norocului timp de 24 de ore.",
        "Foarte Lucky Booster": "Asigură un rezultat pozitiv la Roata Norocului timp de 24 de ore.",
        "Balonul magic": "La utilizare se sparge și oferă 10 bomboane, Lucky Booster și dovleacul vesel.",
        "Îmbrăcăminte violetă": "Adaugă o bordură violetă, elegantă, butoanelor din stânga.",
        "Nume pentru Hanganu": "Deblochează șase nume speciale și animația Hanganu.",
        "Fundal Halloween": "Aplică un fundal Halloween portocaliu și întunecat, activabil din Inventar.",
        "Muzică Halloween": "Redă o melodie Halloween misterioasă, care poate fi pornită din Inventar.",
        "Sunet Halloween": "Aplică un sunet Halloween special la apăsarea elementelor din site.",
        "Iconiță Halloween": "Înlocuiește temporar iconița V cu o față de dovleac.",
        "Screamer Monster": "Cumpără un screamer cu monster și sunet, care poate fi declanșat din Inventar.",
        "Dovleac pe cap": "Acoperă ecranul cu efectul de dovleac; îl poți scoate din partea dreaptă sus.",
        "Halloween Man": "Deschide panoul de navigare rapidă și folosește comenzi rapide de pe tastatură sau telefon."
    };
    let selectedHalloweenPurchase = null;
    const purchaseDialog = $("#halloweenPurchaseDialog");

    $$('[data-buy-reward]').forEach((button) => {
        button.addEventListener("click", () => {
            const reward = button.dataset.buyReward;
            const cost = Number(button.dataset.cost);
            if (halloweenProgress.rewards.includes(reward)) return;
            selectedHalloweenPurchase = { reward, cost };
            $("#halloweenPurchaseTitle").textContent = reward;
            $("#halloweenPurchaseDescription").textContent = purchaseDescriptions[reward] || "Articol special pentru Halloween Event.";
            $("#halloweenPurchaseIcon").textContent = button.closest("article").querySelector("span")?.textContent || "🍬";
            $("#halloweenPurchasePrice").textContent = `${cost} 🍬`;
            if (typeof purchaseDialog.showModal === "function") purchaseDialog.showModal();
            else purchaseDialog.setAttribute("open", "");
        });
    });

    $("[data-purchase-close]")?.addEventListener("click", () => purchaseDialog.close());
    $("#confirmHalloweenPurchase")?.addEventListener("click", () => {
        if (!selectedHalloweenPurchase) return;
        const { reward, cost } = selectedHalloweenPurchase;
        if (halloweenProgress.candy < cost) {
            showToast("🍬", `Mai ai nevoie de ${cost - halloweenProgress.candy} bomboane.`);
            return;
        }
        halloweenProgress.candy -= cost;
        halloweenProgress.rewards.push(reward);
        halloweenProgress.completedActions ||= [];
        if (!halloweenProgress.completedActions.includes("purchase")) halloweenProgress.completedActions.push("purchase");
        const purchaseButton = Array.from(document.querySelectorAll("[data-buy-reward]")).find((button) => button.dataset.buyReward === reward);
        if (purchaseButton?.dataset.category === "accessories" && halloweenProgress.rewards.filter((item) => {
            const button = Array.from(document.querySelectorAll("[data-buy-reward]")).find((candidate) => candidate.dataset.buyReward === item);
            return button?.dataset.category === "accessories";
        }).length >= 3 && !halloweenProgress.completedActions.includes("accessories3")) {
            halloweenProgress.completedActions.push("accessories3");
        }
        saveHalloweenProgress();
        refreshHalloweenPanel();
        purchaseDialog.close();
        showToast("🍬", `${reward} a fost cumpărat!`);
        if (reward === "Screamer Monster") playHalloweenScreamer();
    });

    ["#contactForm", "#reviewForm"].forEach((selector) => {
        document.querySelector(selector)?.addEventListener("submit", () => {
            halloweenProgress.completedActions ||= [];
            if (!halloweenProgress.completedActions.includes("contact")) halloweenProgress.completedActions.push("contact");
            saveHalloweenProgress();
            refreshHalloweenPanel();
        });
    });

    function collectPassiveHalloweenCandy() {
        const now = Date.now();
        if (document.visibilityState === "hidden") {
            halloweenProgress.lastCandyMinuteAt = now;
            return;
        }
        const elapsed = Math.max(0, now - (halloweenProgress.lastCandyMinuteAt || now));
        const minutes = Math.floor(elapsed / 60000);
        if (minutes > 0) {
            halloweenProgress.candy += minutes;
            halloweenProgress.lastCandyMinuteAt += minutes * 60000;
            saveHalloweenProgress();
            refreshHalloweenPanel();
        }
    }

    if (!halloweenProgress.eventEndsAt) halloweenProgress.eventEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    if (!halloweenProgress.completedActions) halloweenProgress.completedActions = [];
    if (!halloweenProgress.active) halloweenProgress.active = {};
    halloweenProgress.lastCandyMinuteAt = Date.now();
    saveHalloweenProgress();
    collectPassiveHalloweenCandy();

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            halloweenProgress.lastCandyMinuteAt = Date.now();
            saveHalloweenProgress();
        } else {
            collectPassiveHalloweenCandy();
        }
    });

    window.setInterval(() => {
        if (document.visibilityState === "visible" && !document.hidden) {
            halloweenProgress.activeSeconds = (halloweenProgress.activeSeconds || 0) + 1;
            if ((halloweenProgress.activeSeconds % 10) === 0) saveHalloweenProgress();
            refreshHalloweenPanel();
        }
    }, 1000);

    window.addEventListener("pagehide", () => {
        halloweenProgress.lastCandyMinuteAt = Date.now();
        saveHalloweenProgress();
    });

    halloweenProgress.gamesWon ||= [];
    const awardHalloweenGame = (game, amount = 50) => {
        if (halloweenProgress.gamesWon.includes(game)) return false;
        halloweenProgress.gamesWon.push(game);
        halloweenProgress.candy += amount;
        saveHalloweenProgress();
        refreshHalloweenPanel();
        showToast("🍬", `Ai câștigat ${amount} bomboane!`);
        return true;
    };

    const runeSymbols = ["☾", "✦", "♄", "⚚", "☽", "♆", "✧", "♁", "☿", "⚝"];
    let puzzleNumber = "";
    function newHalloweenPuzzle() {
        puzzleNumber = String(Math.floor(1000 + Math.random() * 9000));
        $$("[data-puzzle-runes]").forEach((runes) => runes.textContent = [...puzzleNumber].map((digit) => runeSymbols[Number(digit)]).join(" "));
    }
    newHalloweenPuzzle();
    $$("[data-puzzle-start]").forEach((button) => button.addEventListener("click", () => {
        const card = button.closest(".halloween-game-card");
        if (card.querySelector("[data-puzzle-answer]").value === puzzleNumber) {
            card.querySelector("[data-puzzle-status]").textContent = awardHalloweenGame("puzzle") ? "Rezolvat! +50 🍬" : "Ai rezolvat deja acest joc.";
        } else card.querySelector("[data-puzzle-status]").textContent = "Nu este numărul corect.";
    }));

    const mazeMap = ["#########", "#...#...#", "#.#.#.#.#", "#.#...#.#", "#.###.#.#", "#...#...#", "###.#.#.#", "#...#.#.#", "#.###...#"];
    let mazePlayer = { x: 1, y: 1 };
    function drawHalloweenMaze() {
        $$("[data-halloween-maze]").forEach((maze) => {
            maze.innerHTML = mazeMap.map((row, y) => [...row].map((cell, x) => `<span class="halloween-maze-cell ${cell === "#" ? "wall" : ""} ${x === mazePlayer.x && y === mazePlayer.y ? "player" : ""} ${x === 7 && y === 8 ? "exit" : ""}">${x === 7 && y === 8 ? "🚪" : ""}</span>`).join("")).join("");
        });
    }
    drawHalloweenMaze();
    $$("[data-maze-start]").forEach((button) => button.addEventListener("click", () => {
        mazePlayer = { x: 1, y: 1 };
        drawHalloweenMaze();
        button.closest(".halloween-game-card").querySelector("[data-halloween-maze]").focus();
    }));
    document.addEventListener("keydown", (event) => {
        const direction = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[event.key];
        if (!direction || !document.querySelector("[data-halloween-maze]")) return;
        const nextX = mazePlayer.x + direction[0];
        const nextY = mazePlayer.y + direction[1];
        if (mazeMap[nextY]?.[nextX] !== ".") return;
        event.preventDefault();
        mazePlayer = { x: nextX, y: nextY };
        drawHalloweenMaze();
        if (nextX === 7 && nextY === 8) $$("[data-maze-status]").forEach((status) => status.textContent = awardHalloweenGame("maze") ? "Ai ieșit! +50 🍬" : "Labirintul a fost completat.");
    });

    let halloweenClickCount = Number(localStorage.getItem("halloweenClickCount") || 0);
    const updateClickGame = () => {
        $$("[data-click-progress]").forEach((progress) => progress.textContent = `${Math.min(halloweenClickCount, 50)} / 50`);
        if (halloweenClickCount >= 50) $$("[data-click-status]").forEach((status) => status.textContent = awardHalloweenGame("clicker") ? "Complet! +50 🍬" : "Complet! Premiul a fost primit.");
    };
    updateClickGame();
    $$("[data-click-game]").forEach((button) => button.addEventListener("click", () => {
        if (halloweenClickCount >= 50) return;
        halloweenClickCount += 1;
        localStorage.setItem("halloweenClickCount", String(halloweenClickCount));
        updateClickGame();
    }));

    const savedHanganuName = localStorage.getItem("halloweenHanganuName");
    if (savedHanganuName) $$("[data-hanganu-board]").forEach((board) => board.textContent = savedHanganuName);
    $$("[data-hanganu-save]").forEach((button) => button.addEventListener("click", () => {
        const card = button.closest(".halloween-game-card");
        const name = card.querySelector("[data-hanganu-input]").value.trim();
        if (!name) return;
        localStorage.setItem("halloweenHanganuName", name);
        $$("[data-hanganu-board]").forEach((board) => board.textContent = name);
        showToast("👻", `${name} a fost scris pe tablă.`);
    }));

    const chessPieces = { r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙" };
    let chessBoard = [];
    let selectedChessSquare = null;
    function resetHalloweenChess() {
        chessBoard = [["r","n","b","q","k","b","n","r"], ["p","p","p","p","p","p","p","p"], ["","","","","","","",""], ["","","","","","","",""], ["","","","","","","",""], ["","","","","","","",""], ["P","P","P","P","P","P","P","P"], ["R","N","B","Q","K","B","N","R"]];
        selectedChessSquare = null;
        drawHalloweenChess();
    }
    function drawHalloweenChess() {
        $$("[data-halloween-chess]").forEach((boardElement) => {
            boardElement.innerHTML = chessBoard.map((row, y) => row.map((piece, x) => `<button type="button" class="halloween-chess-cell ${(x + y) % 2 ? "dark" : "light"}${selectedChessSquare?.x === x && selectedChessSquare?.y === y ? " selected" : ""}" data-chess-square="${x},${y}">${chessPieces[piece] || ""}</button>`).join("")).join("");
            boardElement.querySelectorAll("[data-chess-square]").forEach((square) => square.addEventListener("click", () => playHalloweenChessSquare(square)));
        });
    }
    function playHalloweenChessSquare(square) {
        const [x, y] = square.dataset.chessSquare.split(",").map(Number);
        const piece = chessBoard[y][x];
        if (selectedChessSquare) {
            const from = selectedChessSquare;
            const moving = chessBoard[from.y][from.x];
            const valid = moving === "P" ? (x === from.x && ((y === from.y - 1 && !piece) || (from.y === 6 && y === 4 && !piece && !chessBoard[5][x])) || (Math.abs(x - from.x) === 1 && y === from.y - 1 && piece && piece === piece.toLowerCase())) : moving && (!piece || piece === piece.toLowerCase());
            if (valid) {
                chessBoard[y][x] = moving;
                chessBoard[from.y][from.x] = "";
                selectedChessSquare = null;
                drawHalloweenChess();
                window.setTimeout(playHalloweenChessBot, 550);
                return;
            }
            selectedChessSquare = null;
        }
        if (piece && piece === piece.toUpperCase()) selectedChessSquare = { x, y };
        drawHalloweenChess();
    }
    function playHalloweenChessBot() {
        const moves = [];
        chessBoard.forEach((row, y) => row.forEach((piece, x) => {
            if (!piece || piece !== piece.toLowerCase()) return;
            [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dx, dy]) => {
                const toY = piece === "p" ? y + 1 : y + dy;
                const toX = piece === "p" ? x : x + dx;
                if (chessBoard[toY]?.[toX] !== undefined && (!chessBoard[toY][toX] || chessBoard[toY][toX] === chessBoard[toY][toX].toUpperCase())) moves.push({ x, y, toX, toY });
            });
        }));
        if (!moves.length) return;
        const move = moves[Math.floor(Math.random() * moves.length)];
        chessBoard[move.toY][move.toX] = chessBoard[move.y][move.x];
        chessBoard[move.y][move.x] = "";
        drawHalloweenChess();
    }
    resetHalloweenChess();
    $$("[data-chess-reset]").forEach((button) => button.addEventListener("click", resetHalloweenChess));

    document.body.classList.add("page-enter");
    window.setTimeout(() => document.body.classList.remove("page-enter"), 350);

    const pageFiles = ["index.html", "news.html", "info.html", "contact.html"];
    const currentSwipePage = pageFiles.find((page) => location.pathname.toLowerCase().endsWith(`/${page}`))
        || pageFiles.find((page) => location.pathname.toLowerCase().endsWith(page));
    let pageDragStart = null;
    let pageDragDelta = 0;
    const pageDragBlocked = (target) => target.closest("dialog, nav, button, a, input, textarea, select, [contenteditable='true'], .halloween-maze, .halloween-chess, label");

    document.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (pageDragBlocked(event.target)) return;
        pageDragStart = { x: event.clientX, y: event.clientY };
        pageDragDelta = 0;
    }, { passive: true });

    document.addEventListener("pointermove", (event) => {
        if (!pageDragStart) return;
        const horizontal = event.clientX - pageDragStart.x;
        const vertical = event.clientY - pageDragStart.y;
        if (Math.abs(horizontal) < Math.abs(vertical) || Math.abs(horizontal) < 12) return;
        pageDragDelta = Math.max(-180, Math.min(180, horizontal));
        document.body.classList.add("is-page-dragging");
        document.documentElement.style.setProperty("--page-drag-x", `${pageDragDelta}px`);
        document.documentElement.style.setProperty("--page-drag-opacity", String(Math.max(.72, 1 - Math.abs(pageDragDelta) / 650)));
    }, { passive: true });

    document.addEventListener("pointerup", () => {
        if (!pageDragStart) return;
        const currentIndex = pageFiles.indexOf(currentSwipePage);
        let targetPage = null;
        if (pageDragDelta <= -90 && currentIndex >= 0 && currentIndex < pageFiles.length - 1) targetPage = pageFiles[currentIndex + 1];
        if (pageDragDelta >= 90 && currentIndex > 0) targetPage = pageFiles[currentIndex - 1];
        pageDragStart = null;
        pageDragDelta = 0;
        document.body.classList.remove("is-page-dragging");
        document.documentElement.style.setProperty("--page-drag-x", "0px");
        document.documentElement.style.setProperty("--page-drag-opacity", "1");
        if (targetPage) {
            document.body.classList.add("page-slide-out");
            window.setTimeout(() => { location.href = targetPage; }, 220);
        }
    });

    function updateHalloweenCountdown() {
        const remaining = Math.max(0, halloweenProgress.eventEndsAt - Date.now());
        const totalSeconds = Math.floor(remaining / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const countdown = $("#halloweenCountdown");
        if (countdown) countdown.textContent = `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
    }

    updateHalloweenCountdown();
    setInterval(updateHalloweenCountdown, 1000);
    setInterval(collectPassiveHalloweenCandy, 1000);
    setInterval(refreshHalloweenPanel, 10000);

    refreshHalloweenPanel();
    if (halloweenProgress.active?.["Muzică Halloween"] === true) toggleHalloweenMusic(true);

    /* MOBILE CONTROLS */

    const mobileTools = {
        mobileScrollTop: "scrollTopBtn",
        mobileNotes: "notesBtn",
        mobileUpdates: "updatesBtn",
        mobileScrollBottom: "scrollBottomBtn",
        mobileSettings: "settingsBtn",
        mobilePoints: "pointsBtn",
        mobileFortuneWheel: "fortuneWheelBtn",
        mobileHalloweenInventory: "halloweenInventoryBtn",
        mobileHalloweenShop: "halloweenShopBtn",
        mobileHalloweenEvent: "halloweenShopBtn",
    };

    Object.entries(mobileTools).forEach(([mobileId, desktopId]) => {

        const mobileButton = document.getElementById(mobileId);
        const desktopButton = document.getElementById(desktopId);

        if (!mobileButton) return;

        mobileButton.addEventListener("click", () => {

            closeSideMenu();

            if (desktopButton) {
                desktopButton.click();
            }

        });

    });

    /* FORTUNE WHEEL */

    const fortuneWheel = $("#fortuneWheel");
    const wheelLabels = $("#fortuneWheelLabels");
    const spinWheelButton = $("#spinFortuneWheel");
    const fortuneResult = $("#fortuneResult");
    const fortuneOutcome = $("#fortuneOutcome");
    const fortuneOutcomeIcon = $("#fortuneOutcomeIcon");
    const fortuneOutcomeText = $("#fortuneOutcomeText");
    const weeklyCountdown = $("#fortuneWeeklyCountdown");
    const wheelStorageKey = "viteaFortuneWheel";
    const wheelSliceCount = 20;
    const wheelSliceAngle = 360 / wheelSliceCount;
    const wheelCooldown = 24 * 60 * 60 * 1000;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isMobileWheel = window.matchMedia("(max-width: 700px)");
    const shouldReduceMotion = () =>
        prefersReducedMotion.matches || document.documentElement.classList.contains("reduce-motion");
    let wheelRotation = 0;
    let wheelState = null;
    let wheelIsSpinning = false;
    let wheelCountdownInterval;

    function getWheelWeekStart(timestamp) {
        const date = new Date(timestamp);
        const daysSinceSaturday = (date.getDay() + 1) % 7;
        date.setDate(date.getDate() - daysSinceSaturday);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    function formatWheelCountdown(milliseconds, includeDays = false) {
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
        const days = Math.floor(totalSeconds / 86400);
        const hourCount = includeDays
            ? Math.floor((totalSeconds % 86400) / 3600)
            : Math.floor(totalSeconds / 3600);
        const hours = String(hourCount).padStart(2, "0");
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");

        return includeDays
            ? `${days} zile ${hours} ore ${minutes} min ${seconds} s`
            : `${hours}h ${minutes}m ${seconds}s`;
    }

    function getNextWheelWeekStart() {
        const nextSaturday = new Date(wheelState.weekStart);
        nextSaturday.setDate(nextSaturday.getDate() + 7);
        return nextSaturday.getTime();
    }

    function showFortuneResult(isNewsDay, bonusGranted = false, animate = false) {
        const message = bonusGranted
            ? "A ieșit minus! Ai primit încă un spin premium pentru această săptămână."
            : isNewsDay
                ? "Vitea va face știri azi! Norocul a decis: astăzi avem noutăți."
                : "Vitea nu va face știri azi. Roata a ales o zi de pauză!";

        fortuneResult.textContent = message;
        fortuneResult.classList.toggle("is-positive", isNewsDay);
        fortuneResult.classList.toggle("is-negative", !isNewsDay);
        if (fortuneOutcome && fortuneOutcomeIcon && fortuneOutcomeText) {
            fortuneOutcome.classList.remove("is-visible", "is-positive", "is-negative", "is-animated");
            fortuneOutcome.classList.add(isNewsDay ? "is-positive" : "is-negative");
            fortuneOutcomeIcon.className = isNewsDay ? "fa-solid fa-star" : "fa-solid fa-face-frown";
            fortuneOutcomeText.textContent = isNewsDay
                ? "PLUS! Zi cu noroc!"
                : bonusGranted
                    ? "MINUS! Spin bonus!"
                    : "MINUS! Zi de pauză!";
            fortuneOutcome.classList.add("is-visible");
            if (animate && !shouldReduceMotion()) {
                void fortuneOutcome.offsetWidth;
                fortuneOutcome.classList.add("is-animated");
            }
        }
    }

    function persistWheelState() {
        try {
            localStorage.setItem(wheelStorageKey, JSON.stringify(wheelState));
        } catch (error) {
            console.error("Nu s-au putut salva spinurile roții norocului.", error);
        }
    }

    function updateWheelAvailability() {
        if (!spinWheelButton || !wheelState || wheelIsSpinning) return;

        if (wheelState.weeklySpinsRemaining > 0) {
            spinWheelButton.disabled = false;
            spinWheelButton.innerHTML = "<span>PREMIUM</span><small>SPIN SĂPTĂMÂNAL</small>";
            return;
        }

        const timeLeft = wheelState.spunAt + wheelCooldown - Date.now();
        spinWheelButton.disabled = timeLeft > 0;
        spinWheelButton.innerHTML = timeLeft > 0
            ? `<span>REVINO ÎN</span><small>${formatWheelCountdown(timeLeft)}</small>`
            : "<span>ROTEȘTE</span><small>DOAR VITEA</small>";
    }

    function updateWeeklyCountdown() {
        if (!weeklyCountdown) return;

        if (getWheelWeekStart(Date.now()) !== wheelState.weekStart) {
            wheelState.weekStart = getWheelWeekStart(Date.now());
            wheelState.weeklySpinsRemaining = 1;
            wheelState.weeklyBonusUsed = false;
            persistWheelState();
            updateWheelAvailability();
        }
        const nextSaturday = getNextWheelWeekStart();
        weeklyCountdown.textContent = formatWheelCountdown(nextSaturday - Date.now(), true);
    }

    if (fortuneWheel && wheelLabels && spinWheelButton && fortuneResult) {
        for (let index = 0; index < wheelSliceCount; index += 1) {
            const label = document.createElement("span");
            const isPositive = index % 2 === 0;

            label.className = `fortune-wheel-label ${isPositive ? "is-positive" : "is-negative"}`;
            label.textContent = isPositive ? "+" : "−";
            label.style.transform = `translate(-50%, -50%) rotate(${index * wheelSliceAngle + wheelSliceAngle / 2}deg) translateY(calc(var(--wheel-size) * -0.37)) rotate(90deg)`;
            wheelLabels.appendChild(label);
        }

        let savedSpin = null;

        try {
            savedSpin = JSON.parse(localStorage.getItem(wheelStorageKey));
        } catch (error) {
            console.error("Nu s-au putut citi datele salvate pentru roata norocului.", error);
        }

        const currentWeekStart = getWheelWeekStart(Date.now());
        const savedWeeklyState = savedSpin?.weekStart === currentWeekStart;
        wheelState = {
            spunAt: Number.isFinite(savedSpin?.spunAt) ? savedSpin.spunAt : 0,
            index: Number.isInteger(savedSpin?.index) ? savedSpin.index : null,
            weekStart: currentWeekStart,
            weeklySpinsRemaining: savedWeeklyState && Number.isInteger(savedSpin.weeklySpinsRemaining)
                ? Math.max(0, Math.min(2, savedSpin.weeklySpinsRemaining))
                : 1,
            weeklyBonusUsed: savedWeeklyState && savedSpin.weeklyBonusUsed === true,
            lastSpinWasPremium: savedSpin?.lastSpinWasPremium === true,
            lastSpinBonusGranted: savedSpin?.lastSpinBonusGranted === true
        };

        if (Number.isFinite(savedSpin?.spunAt) && Number.isInteger(savedSpin.index)) {
            const savedIndex = ((savedSpin.index % wheelSliceCount) + wheelSliceCount) % wheelSliceCount;
            const winningAngle = savedIndex * wheelSliceAngle + wheelSliceAngle / 2;
            const settledAngle = (360 - winningAngle + 360) % 360;

            wheelRotation = settledAngle;
            fortuneWheel.style.transform = `rotate(${settledAngle}deg)`;
            showFortuneResult(savedIndex % 2 === 0, savedSpin.lastSpinBonusGranted === true);
        }

        updateWeeklyCountdown();
        updateWheelAvailability();
        wheelCountdownInterval = window.setInterval(() => {
            updateWeeklyCountdown();
            updateWheelAvailability();
        }, 1000);

        spinWheelButton.addEventListener("click", () => {
            if (spinWheelButton.disabled || wheelIsSpinning) return;

            const isPremiumSpin = wheelState.weeklySpinsRemaining > 0;
            if (!isPremiumSpin && Date.now() < wheelState.spunAt + wheelCooldown) return;

            const guaranteedLucky = Number(halloweenProgress?.guaranteedLuckyUntil || 0) > Date.now();
            const luckyBoosterActive = guaranteedLucky || Number(halloweenProgress?.boosterUntil || 0) > Date.now();
            const luckyIndexPool = Array.from({ length: wheelSliceCount / 2 }, (_, index) => index * 2);
            const winningIndex = guaranteedLucky
                ? luckyIndexPool[Math.floor(Math.random() * luckyIndexPool.length)]
                : luckyBoosterActive && Math.random() < 0.8
                ? luckyIndexPool[Math.floor(Math.random() * luckyIndexPool.length)]
                : Math.floor(Math.random() * wheelSliceCount);
            const isNewsDay = winningIndex % 2 === 0;
            const bonusGranted = isPremiumSpin && !wheelState.weeklyBonusUsed && !isNewsDay;
            const winningAngle = winningIndex * wheelSliceAngle + wheelSliceAngle / 2;
            const spinTurns = isMobileWheel.matches ? 4 : 6;
            const currentAngle = ((wheelRotation % 360) + 360) % 360;
            const targetAngle = (360 - winningAngle + 360) % 360;
            const rotationToTarget = (targetAngle - currentAngle + 360) % 360;
            const finalAngle = wheelRotation + 360 * spinTurns + rotationToTarget;

            wheelIsSpinning = true;
            spinWheelButton.disabled = true;
            fortuneResult.textContent = "Roata se învârte... să vedem ce aduce norocul!";
            fortuneResult.classList.remove("is-positive", "is-negative");
            fortuneOutcome?.classList.remove("is-visible", "is-animated");
            wheelRotation = finalAngle;
            fortuneWheel.style.transform = `rotate(${finalAngle}deg)`;

            if (isPremiumSpin) {
                wheelState.weeklySpinsRemaining -= 1;
                if (!wheelState.weeklyBonusUsed) {
                    wheelState.weeklyBonusUsed = true;
                    if (bonusGranted) wheelState.weeklySpinsRemaining += 1;
                }
            } else {
                wheelState.spunAt = Date.now();
            }
            wheelState.index = winningIndex;
            wheelState.lastSpinWasPremium = isPremiumSpin;
            wheelState.lastSpinBonusGranted = bonusGranted;
            persistWheelState();

            const finishSpin = () => {
                wheelIsSpinning = false;
                showFortuneResult(isNewsDay, bonusGranted, true);
                updateWheelAvailability();
                recordSiteUpdate(
                    "Roata norocului rotită",
                    bonusGranted
                        ? "Rezultatul roții: minus; Vitea a primit un spin premium suplimentar pentru această săptămână."
                        : isNewsDay
                            ? "Rezultatul roții: Vitea va face știri azi."
                            : "Rezultatul roții: Vitea nu va face știri azi."
                );
            };

            if (shouldReduceMotion()) {
                finishSpin();
            } else {
                window.setTimeout(finishSpin, isMobileWheel.matches ? 3200 : 5100);
            }
        });
    }

    /* NOTES */

    const notesText = $("#notesText");
    const saveNotes = $("#saveNotes");

    const savedNotes = localStorage.getItem("viteaNotes");

    if (savedNotes && notesText) {
        notesText.value = savedNotes;
    }

    if (saveNotes && notesText) {
        saveNotes.addEventListener("click", () => {
            if (!notesText.value.trim()) {
                showToast("⚠️", "Scrie o notiță înainte să o salvezi.");
                return;
            }

            localStorage.setItem("viteaNotes", notesText.value);
            if (/nichita\s+e\s+col[tț]et[aă]/i.test(notesText.value)) {
                halloweenProgress.completedActions ||= [];
                if (!halloweenProgress.completedActions.includes("nichitaNote")) halloweenProgress.completedActions.push("nichitaNote");
                saveHalloweenProgress();
                refreshHalloweenPanel();
            }
            recordSiteUpdate("Notițe salvate", "Notițele personale au fost actualizate.");
            showToast("✓", "Notițele au fost salvate!");
        });
    }

    /* UPDATE LOG */

    const updateHistoryKey = "viteaUpdate02History";
    const updateUnreadKey = "viteaUpdatesUnread";
    const updateMigrationKey = "viteaUpdate02HistoryMigrated";
    const updateVersionKey = "viteaUpdate02ConsolidatedSeen";
    const notesUpdateList = $("#notesUpdateLogList");
    let savedUpdates = [];

    if (localStorage.getItem(updateMigrationKey) !== "true") {
        localStorage.removeItem(updateHistoryKey);
        localStorage.setItem(updateMigrationKey, "true");
        localStorage.setItem(updateUnreadKey, "true");
    }

    localStorage.removeItem("viteaUpdateHistory");

    try {
        savedUpdates = JSON.parse(localStorage.getItem(updateHistoryKey) || "[]");
        if (!Array.isArray(savedUpdates)) savedUpdates = [];
    } catch (error) {
        savedUpdates = [];
    }

    savedUpdates = savedUpdates.filter((update) => !update.title.startsWith("Update 02"));

    const updates = [
        ...savedUpdates,
        {
            title: "UPDATE 4 HALLOWEN EVENT",
            text: "1. S-a adăugat un magazin de Halloween.\n2. S-au adăugat rechizitele de Halloween cu bomboane.\n3. Poți colecta bomboane prin questuri și stând în site.\n4. S-a adăugat un meniu Jocuri unde poți colecta și aici bomboane.\n5. S-a schimbat fundalul site-ului."
        }
    ];

    const updateList = $("#updateList");

    function updateUnreadIndicators() {
        const isUnread = localStorage.getItem(updateUnreadKey) === "true";

        $("#hamburger")?.classList.toggle("has-unread-updates", isUnread);
        $("#mobileUpdates")?.classList.toggle("has-unread-updates", isUnread);
        $("#updatesBtn")?.classList.toggle("has-unread-updates", isUnread);
        $("#hamburger")?.setAttribute(
            "aria-label",
            isUnread ? "Deschide meniul, ai actualizări noi" : "Deschide meniul"
        );
    }

    function markUpdatesAsRead() {
        localStorage.setItem(updateUnreadKey, "false");
        localStorage.setItem(updateVersionKey, "true");
        updateUnreadIndicators();
    }

    function renderNotesUpdateLog() {
        if (!notesUpdateList) return;

        const realUpdates = savedUpdates.slice(0, 5);
        notesUpdateList.replaceChildren();

        if (!realUpdates.length) {
            const emptyItem = document.createElement("li");
            emptyItem.className = "notes-update-log-empty";
            emptyItem.textContent = "Nicio actualizare recentă.";
            notesUpdateList.appendChild(emptyItem);
            return;
        }

        realUpdates.forEach((update) => {
            const item = document.createElement("li");
            const title = document.createElement("strong");
            const text = document.createElement("p");

            item.className = "notes-update-log-item";
            title.textContent = update.title;
            text.textContent = update.text;
            item.append(title, text);
            notesUpdateList.appendChild(item);
        });
    }

    function recordSiteUpdate(title, text) {
        const entry = { title, text, date: new Date().toISOString() };
        savedUpdates.unshift(entry);
        savedUpdates = savedUpdates.slice(0, 30);
        updates.unshift(entry);

        try {
            localStorage.setItem(updateHistoryKey, JSON.stringify(savedUpdates));
            localStorage.setItem(updateUnreadKey, "true");
        } catch (error) {
            // Indicatorul vizual rămâne activ chiar dacă stocarea nu este disponibilă.
        }

        updateUnreadIndicators();
        renderNotesUpdateLog();
        renderUpdates();
    }

    if (localStorage.getItem(updateVersionKey) !== "true") {
        localStorage.setItem(updateUnreadKey, "true");
    }

    updateUnreadIndicators();
    renderNotesUpdateLog();

    function renderUpdates() {
        if (!updateList) return;

        updateList.replaceChildren();

        updates.forEach((update) => {
            const item = document.createElement("div");
            const title = document.createElement("strong");
            const text = document.createElement("p");

            item.className = "update-item";
            title.textContent = update.title;
            text.textContent = update.text;
            item.append(title, text);

            if (update.date) {
                const date = document.createElement("time");
                date.dateTime = update.date;
                date.textContent = new Intl.DateTimeFormat("ro-RO", {
                    dateStyle: "medium",
                    timeStyle: "short"
                }).format(new Date(update.date));
                item.appendChild(date);
            }

            updateList.appendChild(item);
        });
    }

    renderUpdates();

    $("#footerUpdateLog")?.addEventListener("click", (event) => {
        event.preventDefault();
        openModal("updatesModal");
        markUpdatesAsRead();
    });

    const firstUpdateLogKey = "viteaUpdate4FirstVisitShown";
    if (!localStorage.getItem(firstUpdateLogKey)) {
        localStorage.setItem(firstUpdateLogKey, "true");
        markUpdatesAsRead();
        window.setTimeout(() => openModal("updatesModal"), 700);
    }

    /* 67 COLORS */

    const colors = [
        "#1683ff",
        "#0066d6",
        "#00a8ff",
        "#0097e6",
        "#1e90ff",
        "#3498db",
        "#2980b9",
        "#3c8ce7",
        "#4776e6",
        "#4facfe",
        "#00c6ff",
        "#00b4db",
        "#00aaff",
        "#008cff",
        "#0077ff",
        "#5865f2",
        "#6366f1",
        "#6c5ce7",
        "#7c5cff",
        "#8b5cf6",
        "#9333ea",
        "#a855f7",
        "#c084fc",
        "#d946ef",
        "#ec4899",
        "#f43f5e",
        "#ef4444",
        "#e74c3c",
        "#ff4757",
        "#ff6348",
        "#ff7f50",
        "#ff6b6b",
        "#ff5252",
        "#ff8c00",
        "#ffa502",
        "#ff9f43",
        "#f59e0b",
        "#f1c40f",
        "#feca57",
        "#f6e58d",
        "#badc58",
        "#a3cb38",
        "#78c850",
        "#2ecc71",
        "#27ae60",
        "#20bf6b",
        "#10b981",
        "#00b894",
        "#1abc9c",
        "#00cec9",
        "#16a085",
        "#009688",
        "#26a69a",
        "#795548",
        "#8d6e63",
        "#607d8b",
        "#78909c",
        "#546e7a",
        "#455a64",
        "#34495e",
        "#2c3e50",
        "#273c75",
        "#192a56",
        "#353b48",
        "#718093",
        "#9c88ff",
        "#e84393"
    ];

    const colorGrid = $("#colorGrid");

    const savedColor =
        localStorage.getItem("viteaColor") || "#1683ff";

    function setColor(color) {

        document.documentElement.style.setProperty(
            "--primary",
            color
        );

        const darkColor = shadeColor(color, -25);

        document.documentElement.style.setProperty(
            "--primary-dark",
            darkColor
        );

        const lightColor = hexToRgba(color, 0.15);

        document.documentElement.style.setProperty(
            "--primary-light",
            lightColor
        );

        localStorage.setItem("viteaColor", color);

        $$(".color-option").forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.color === color
            );

        });
    }

    function hexToRgba(hex, alpha) {

        const clean = hex.replace("#", "");

        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function shadeColor(color, percent) {

        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);

        R = Math.max(
            0,
            Math.min(
                255,
                R * (100 + percent) / 100
            )
        );

        G = Math.max(
            0,
            Math.min(
                255,
                G * (100 + percent) / 100
            )
        );

        B = Math.max(
            0,
            Math.min(
                255,
                B * (100 + percent) / 100
            )
        );

        return "#" +
            Math.round(R).toString(16).padStart(2, "0") +
            Math.round(G).toString(16).padStart(2, "0") +
            Math.round(B).toString(16).padStart(2, "0");
    }

    colors.forEach((color) => {

        const button = document.createElement("button");

        button.className = "color-option";

        button.dataset.color = color;

        button.style.background = color;

        button.title = color;

        button.addEventListener("click", () => {
            setColor(color);

            recordSiteUpdate("Culoarea site-ului schimbată", `A fost aleasă culoarea ${color}.`);

            showToast(
                "🎨",
                "Culoarea a fost schimbată!"
            );
        });

        colorGrid?.appendChild(button);

    });

    setColor(savedColor);

    /* NOTIFICATIONS */

    const notificationToggle = $("#notificationToggle");

    const savedNotifications =
        localStorage.getItem("viteaNotifications");

    if (notificationToggle) {

        notificationToggle.checked =
            savedNotifications !== "off";

        notificationToggle.addEventListener(
            "change",
            () => {

                localStorage.setItem(
                    "viteaNotifications",
                    notificationToggle.checked
                        ? "on"
                        : "off"
                );

                recordSiteUpdate(
                    "Preferințe notificări schimbate",
                    notificationToggle.checked ? "Notificările au fost activate." : "Notificările au fost dezactivate."
                );

                showToast(
                    notificationToggle.checked ? "🔔" : "🔕",
                    notificationToggle.checked
                        ? "Notificările sunt activate."
                        : "Notificările sunt dezactivate."
                );

            }
        );

    }

    /* TEXT SIZE */

    const savedTextSize =
        localStorage.getItem("viteaTextSize") || "medium";

    function setTextSize(size) {

        document.body.classList.remove(
            "text-small",
            "text-medium",
            "text-large",
            "text-extra"
        );

        document.body.classList.add(
            `text-${size}`
        );

        localStorage.setItem(
            "viteaTextSize",
            size
        );

        $$("[data-text-size]").forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.textSize === size
            );

        });
    }

    $$("[data-text-size]").forEach((button) => {

        button.addEventListener("click", () => {

            setTextSize(
                button.dataset.textSize
            );

            recordSiteUpdate("Dimensiunea textului schimbată", `Textul este acum setat la nivelul ${button.textContent.trim()}.`);

            showToast(
                "Aa",
                "Dimensiunea textului a fost schimbată."
            );

        });

    });

    setTextSize(savedTextSize);

    /* APPEARANCE AND ACCESSIBILITY SETTINGS */

    const themeToggle = $("#themeToggle");
    const contrastToggle = $("#contrastToggle");
    const motionToggle = $("#motionToggle");
    const settingsStatus = $("#settingsStatus");
    let settingsPersistenceFailed = false;

    function saveSetting(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            settingsPersistenceFailed = true;
            console.error(`Nu s-a putut salva setarea ${key}.`, error);
            if (settingsStatus) {
                settingsStatus.textContent = "Setarea funcționează până la reîncărcarea paginii, dar nu a putut fi salvată.";
            }
            return false;
        }
    }

    function setTheme(isLight, persist = true) {
        document.documentElement.dataset.theme = isLight ? "light" : "dark";
        if (themeToggle) themeToggle.checked = isLight;
        if (persist) saveSetting("viteaTheme", isLight ? "light" : "dark");
    }

    function setHighContrast(isEnabled, persist = true) {
        document.body.classList.toggle("high-contrast", isEnabled);
        if (contrastToggle) contrastToggle.checked = isEnabled;
        if (persist) saveSetting("viteaHighContrast", String(isEnabled));
    }

    function setReducedMotion(isEnabled, persist = true) {
        document.documentElement.classList.toggle("reduce-motion", isEnabled);
        if (motionToggle) motionToggle.checked = isEnabled;
        if (persist) saveSetting("viteaReduceMotion", String(isEnabled));
    }

    let savedTheme = "dark";
    let savedHighContrast = false;
    let savedReducedMotion = false;
    try {
        savedTheme = localStorage.getItem("viteaTheme") === "light" ? "light" : "dark";
        savedHighContrast = localStorage.getItem("viteaHighContrast") === "true";
        savedReducedMotion = localStorage.getItem("viteaReduceMotion") === "true";
    } catch (error) {
        console.error("Nu s-au putut încărca preferințele de aspect.", error);
        if (settingsStatus) {
            settingsStatus.textContent = "Preferințele salvate nu au putut fi încărcate; se folosesc valorile implicite.";
        }
    }

    setTheme(savedTheme === "light", false);
    setHighContrast(savedHighContrast, false);
    setReducedMotion(savedReducedMotion, false);

    themeToggle?.addEventListener("change", () => {
        setTheme(themeToggle.checked);
        showToast(themeToggle.checked ? "☀️" : "🌙", themeToggle.checked ? "Modul luminos este activ." : "Modul întunecat este activ.");
    });

    contrastToggle?.addEventListener("change", () => {
        setHighContrast(contrastToggle.checked);
        showToast("◐", contrastToggle.checked ? "Contrastul ridicat este activ." : "Contrastul standard este activ.");
    });

    motionToggle?.addEventListener("change", () => {
        setReducedMotion(motionToggle.checked);
        showToast("♿", motionToggle.checked ? "Animațiile au fost reduse." : "Animațiile sunt activate.");
    });

    /* CONTACT */

    $("#contactForm")?.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();
            openContactConfirmation("send");

        }
    );

    /* READ MORE */

    $$(".read-more").forEach((button) => {

        button.addEventListener("click", () => {

            showToast(
                "ℹ️",
                "Mai multe informații vor fi adăugate."
            );

        });

    });

    /* TOAST */

    let toastTimer;

    function showToast(icon, message) {

        const toast = $("#toast");
        const toastIcon = $("#toastIcon");
        const toastMessage = $("#toastMessage");

        if (!toast) return;

        toastIcon.textContent = icon;
        toastMessage.textContent = message;

        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2600);
    }

    window.showContactToast = showToast;

    /* ACTIVE NAVIGATION */

    const sections = [
        "home",
        "news",
        "info",
        "contact"
    ];

    const sectionMenuButtons = $$(
        ".desktop-navigation [data-section], .bottom-navigation [data-section]"
    );

    function setCurrentSection(sectionId) {
        sectionMenuButtons.forEach((button) => {
            const isCurrent = button.dataset.section === sectionId;
            button.classList.toggle("active", isCurrent);
            button.classList.toggle("current", isCurrent);
            button.disabled = isCurrent;

            if (isCurrent) {
                button.setAttribute("aria-current", "page");
            } else {
                button.removeAttribute("aria-current");
            }
        });
    }

    const observer = new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (!entry.isIntersecting) return;

                setCurrentSection(entry.target.id);

            });

        },
        {
            rootMargin: "-35% 0px -55% 0px"
        }
    );

    sections.forEach((id) => {

        const section = document.getElementById(id);

        if (section) {
            observer.observe(section);
        }

    });

    /* MOBILE HEADER TOOLS */

    const searchInput = $("#siteSearchInput");
    const searchResults = $("#siteSearchResults");
    const searchEmpty = $("#siteSearchEmpty");
    const searchHeaderButton = $("#searchHeaderBtn");
    const voiceSearchButton = $("#voiceSearchButton");
    const voiceSearchIcon = $("#voiceSearchIcon");
    const voiceSearchStatus = $("#voiceSearchStatus");
    const searchField = $(".site-search-field");
    const voiceWaveform = $(".voice-waveform");
    const timeHeaderButton = $("#timeHeaderBtn");
    const soundHeaderButton = $("#soundHeaderBtn");
    const refreshHeaderButton = $("#refreshHeaderBtn");
    const quickSoundStatus = $("#quickSoundStatus");
    const quickSoundIcon = $("#quickSoundIcon");

    function normalizeSearch(value) {
        return value
            .toLocaleLowerCase("ro-RO")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function collectSearchItems() {
        const targets = [
            { selector: '.desktop-navigation [data-section="home"]', label: "Acasă", category: "Meniu" },
            { selector: '.desktop-navigation [data-section="news"]', label: "Ultimele știri", category: "Meniu" },
            { selector: '.desktop-navigation [data-section="info"]', label: "Informații", category: "Meniu" },
            { selector: '.desktop-navigation [data-section="contact"]', label: "Contact / recenzii", category: "Meniu" },
            { selector: 'footer a[href="safety.html"]', label: "Respect și siguranță", category: "Footer" },
            { selector: 'footer a[href="help.html"]', label: "Ajutor", category: "Footer" },
            { selector: 'footer a[href="about-site.html"]', label: "Despre site", category: "Footer" },
            { selector: "#scrollTopBtn", label: "Mergi sus", category: "Butoane din stânga" },
            { selector: "#notesBtn", label: "Notițe", category: "Butoane din stânga" },
            { selector: "#updatesBtn", label: "Notify Changes", category: "Butoane din stânga" },
            { selector: "#scrollBottomBtn", label: "Mergi jos", category: "Butoane din stânga" },
            { selector: "#settingsBtn", label: "Setări", category: "Butoane din dreapta" },
            { selector: "#fortuneWheelBtn", label: "Roata norocului", category: "Butoane din dreapta" },
            { selector: "#pointsBtn", label: "Despre noi", category: "Butoane din dreapta" },
            {
                selector: "#questionBtn",
                label: "Funcții rapide",
                category: "Butoane din dreapta",
                desktopOnly: true
            },
            {
                selector: "footer",
                label: "Footer",
                category: "Navigare",
                activate: (element) => element.scrollIntoView({ behavior: "smooth", block: "start" })
            }
        ];

        return targets.flatMap(({ selector, label, category, activate, desktopOnly }) => {
            if (desktopOnly && window.matchMedia("(max-width: 700px)").matches) return [];

            const element = document.querySelector(selector);
            if (!element) return [];

            return [{
                element,
                label,
                category,
                searchText: `${label} ${category}`,
                activate: activate ? () => activate(element) : () => element.click()
            }];
        });
    }

    let searchItems = collectSearchItems();

    function renderSearchResults(query = "") {
        if (!searchResults) return;

        const normalizedQuery = normalizeSearch(query.trim());
        const matches = searchItems.filter((item) =>
            normalizeSearch(`${item.label} ${item.category} ${item.searchText}`).includes(normalizedQuery)
        );

        searchResults.replaceChildren();
        searchEmpty.hidden = matches.length > 0;

        matches.forEach((item) => {
            const resultButton = document.createElement("button");
            const label = document.createElement("span");
            const category = document.createElement("small");

            resultButton.className = "search-result";
            resultButton.type = "button";
            label.textContent = item.label;
            category.textContent = item.category;
            resultButton.append(label, category);

            resultButton.addEventListener("click", () => {
                closeModal("searchModal");
                item.activate();
            });

            searchResults.appendChild(resultButton);
        });
    }

    function openSiteSearch() {
        searchItems = collectSearchItems();
        searchInput.value = "";
        if (window.SpeechRecognition || window.webkitSpeechRecognition) {
            setVoiceSearchStatus("");
        }
        renderSearchResults();
        openModal("searchModal");
        window.setTimeout(() => searchInput.focus(), 80);
    }

    searchHeaderButton?.addEventListener("click", openSiteSearch);

    searchInput?.addEventListener("input", () => renderSearchResults(searchInput.value));
    searchInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            searchResults.querySelector(".search-result")?.click();
        }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let speechRecognition = null;
    let voiceSearchActive = false;
    let voiceWaveTimeout;
    let voiceSearchRestartTimer;

    function setVoiceSearchStatus(message, isError = false) {
        if (!voiceSearchStatus) return;

        voiceSearchStatus.textContent = message;
        voiceSearchStatus.classList.toggle("is-error", isError);
    }

    function setVoiceSearchActive(active) {
        voiceSearchActive = active;
        voiceSearchButton?.classList.toggle("is-listening", active);
        searchField?.classList.toggle("is-listening", active);
        voiceSearchButton?.setAttribute("aria-pressed", String(active));
        voiceSearchButton?.setAttribute(
            "aria-label",
            active ? "Oprește căutarea vocală" : "Caută cu vocea"
        );
        if (voiceSearchButton) {
            voiceSearchButton.title = active ? "Oprește ascultarea" : "Caută cu vocea";
        }
        if (voiceSearchIcon) {
            voiceSearchIcon.className = `fa-solid ${active ? "fa-xmark" : "fa-microphone"}`;
        }
        if (!active) {
            window.clearTimeout(voiceWaveTimeout);
            voiceWaveform?.classList.remove("is-speaking");
        }
    }

    function setVoiceSearchSpeaking(speaking) {
        if (!voiceSearchActive || !voiceWaveform) return;

        voiceWaveform.classList.toggle("is-speaking", speaking);
        window.clearTimeout(voiceWaveTimeout);
        if (speaking) {
            voiceWaveTimeout = window.setTimeout(() => {
                voiceWaveform.classList.remove("is-speaking");
            }, 700);
        }
    }

    if (SpeechRecognition && voiceSearchButton) {
        speechRecognition = new SpeechRecognition();
        speechRecognition.lang = "ro-RO";
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.maxAlternatives = 1;

        speechRecognition.addEventListener("start", () => {
            setVoiceSearchActive(true);
            setVoiceSearchStatus("Te ascult... Spune ce vrei să cauți.");
        });

        speechRecognition.addEventListener("speechstart", () => {
            setVoiceSearchSpeaking(true);
        });

        speechRecognition.addEventListener("speechend", () => {
            setVoiceSearchSpeaking(false);
        });

        speechRecognition.addEventListener("result", (event) => {
            const transcript = Array.from(event.results)
                .map((result) => result[0].transcript)
                .join(" ")
                .trim();

            if (!transcript) return;

            searchInput.value = transcript;
            renderSearchResults(transcript);
            setVoiceSearchStatus(`Caut: ${transcript}`);
            setVoiceSearchSpeaking(true);
        });

        speechRecognition.addEventListener("error", (event) => {
            const messages = {
                "not-allowed": "Permite accesul la microfon în browser pentru a căuta vocal.",
                "service-not-allowed": "Serviciul de recunoaștere vocală nu este permis.",
                "no-speech": "Nu am auzit vocea. Rămân în modul de ascultare; vorbește aproape de microfon.",
                "audio-capture": "Nu am găsit un microfon disponibil.",
                "network": "Căutarea vocală are nevoie de o conexiune la internet."
            };

            const isNoSpeech = event.error === "no-speech";
            setVoiceSearchStatus(messages[event.error] || "Căutarea vocală nu a pornit. Încearcă din nou.", !isNoSpeech);
            if (isNoSpeech) return;

            window.clearTimeout(voiceSearchRestartTimer);
            setVoiceSearchActive(false);
        });

        speechRecognition.addEventListener("end", () => {
            if (voiceSearchActive && $("#searchModal")?.classList.contains("show")) {
                setVoiceSearchStatus("Reconectez microfonul...");
                voiceSearchRestartTimer = window.setTimeout(() => {
                    if (!voiceSearchActive || !$("#searchModal")?.classList.contains("show")) return;
                    try {
                        speechRecognition.start();
                    } catch (error) {
                        console.error("Nu s-a putut reporni recunoașterea vocală.", error);
                        setVoiceSearchActive(false);
                        setVoiceSearchStatus("Ascultarea s-a întrerupt. Apasă din nou microfonul pentru a încerca.", true);
                    }
                }, 250);
                return;
            }

            window.clearTimeout(voiceSearchRestartTimer);
            setVoiceSearchActive(false);
        });

        voiceSearchButton.addEventListener("click", () => {
            if (voiceSearchActive) {
                speechRecognition.stop();
                setVoiceSearchActive(false);
                setVoiceSearchStatus("Ascultarea a fost oprită.");
                return;
            }

            setVoiceSearchActive(true);
            setVoiceSearchStatus("Se conectează la microfon...");

            try {
                speechRecognition.start();
            } catch (error) {
                setVoiceSearchActive(false);
                setVoiceSearchStatus("Microfonul este deja activ. Așteaptă un moment și încearcă din nou.", true);
            }
        });
    } else if (voiceSearchButton) {
        voiceSearchButton.disabled = true;
        voiceSearchButton.title = "Căutarea vocală nu este disponibilă în acest browser";
        voiceSearchButton.setAttribute("aria-label", "Căutarea vocală nu este disponibilă în acest browser");
        setVoiceSearchStatus("Căutarea vocală nu este acceptată de acest browser. Poți scrie în câmp.");
    }

    const currentTime = $("#currentTime");
    const currentDate = $("#currentDate");

    function updateCurrentTime() {
        const now = new Date();

        if (currentTime) {
            currentTime.dateTime = now.toISOString();
            currentTime.textContent = new Intl.DateTimeFormat("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }).format(now);
        }

        if (currentDate) {
            currentDate.textContent = new Intl.DateTimeFormat("ro-RO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(now);
        }
    }

    updateCurrentTime();
    window.setInterval(updateCurrentTime, 1000);
    timeHeaderButton?.addEventListener("click", () => openModal("timeModal"));

    let soundEnabled = false;
    let audioContext;
    const soundTypeSelect = $("#soundTypeSelect");
    const previewSoundButton = $("#previewSoundButton");
    const soundSettingsStatus = $("#soundSettingsStatus");
    const soundEnabledToggle = $("#soundEnabledToggle");
    const soundChoices = $("#soundChoices");
    const soundPickerStatus = $("#soundPickerStatus");
    const soundPresets = {
        classic: {
            label: "Click clasic",
            icon: "fa-computer-mouse",
            notes: [{ type: "sine", frequency: 620, endFrequency: 420, duration: 0.055, volume: 0.025 }]
        },
        bell: {
            label: "Clopoțel",
            icon: "fa-bell",
            notes: [
                { type: "sine", frequency: 880, endFrequency: 880, duration: 0.12, volume: 0.025 },
                { type: "sine", frequency: 1174.66, endFrequency: 1174.66, duration: 0.1, delay: 0.065, volume: 0.018 }
            ]
        },
        retro: {
            label: "Retro",
            icon: "fa-gamepad",
            notes: [
                { type: "square", frequency: 440, endFrequency: 660, duration: 0.045, volume: 0.012 },
                { type: "square", frequency: 660, endFrequency: 880, duration: 0.045, delay: 0.05, volume: 0.012 }
            ]
        },
        soft: {
            label: "Ton discret",
            icon: "fa-feather",
            notes: [{ type: "triangle", frequency: 520, endFrequency: 440, duration: 0.09, volume: 0.018 }]
        },
        chime: {
            label: "Armonios",
            icon: "fa-music",
            notes: [
                { type: "sine", frequency: 659.25, endFrequency: 659.25, duration: 0.1, volume: 0.02 },
                { type: "sine", frequency: 783.99, endFrequency: 783.99, duration: 0.12, delay: 0.07, volume: 0.018 }
            ]
        },
        pop: {
            label: "Pop",
            icon: "fa-circle",
            notes: [{ type: "sine", frequency: 760, endFrequency: 300, duration: 0.07, volume: 0.025 }]
        },
        bubbly: {
            label: "Bule",
            icon: "fa-water",
            notes: [
                { type: "sine", frequency: 520, endFrequency: 780, duration: 0.07, volume: 0.018 },
                { type: "sine", frequency: 680, endFrequency: 950, duration: 0.06, delay: 0.08, volume: 0.015 }
            ]
        },
        pulse: {
            label: "Puls",
            icon: "fa-heart-pulse",
            notes: [
                { type: "triangle", frequency: 440, endFrequency: 440, duration: 0.055, volume: 0.022 },
                { type: "triangle", frequency: 554.37, endFrequency: 554.37, duration: 0.065, delay: 0.08, volume: 0.022 }
            ]
        }
    };
    let selectedSound = "classic";

    try {
        soundEnabled = localStorage.getItem("viteaClickSound") === "true";
        const savedSound = localStorage.getItem("viteaClickSoundType");
        if (savedSound && soundPresets[savedSound]) {
            selectedSound = savedSound;
        }
    } catch (error) {
        console.error("Preferințele pentru sunet nu au putut fi încărcate.", error);
        if (soundSettingsStatus) {
            soundSettingsStatus.textContent = "Preferințele audio nu au putut fi încărcate; se folosesc setările implicite.";
        }
    }

    function updateSoundButton() {
        const label = soundEnabled ? "Oprește sunetele" : "Activează sunetele";
        const soundName = soundPresets[selectedSound].label;

        if (soundHeaderButton) {
            const icon = soundHeaderButton.querySelector("i");
            soundHeaderButton.title = `Alege sunetul · ${soundName} · ${label}`;
            soundHeaderButton.setAttribute("aria-label", `Alege sunetul pentru apăsări. Sunet ${soundEnabled ? "activat" : "dezactivat"}: ${soundName}.`);
            soundHeaderButton.classList.toggle("is-active", soundEnabled);
            icon?.classList.toggle("fa-volume-high", soundEnabled);
            icon?.classList.toggle("fa-volume-xmark", !soundEnabled);
        }

        if (soundEnabledToggle) soundEnabledToggle.checked = soundEnabled;
        if (soundTypeSelect) soundTypeSelect.value = selectedSound;
        if (quickSoundStatus) {
            quickSoundStatus.textContent = `${soundEnabled ? "Activat" : "Dezactivat"} · ${soundName}`;
        }
        quickSoundIcon?.classList.toggle("fa-volume-high", soundEnabled);
        quickSoundIcon?.classList.toggle("fa-volume-xmark", !soundEnabled);
    }

    function updateSoundChoiceButtons() {
        soundChoices?.querySelectorAll("[data-select-sound]").forEach((button) => {
            const isSelected = button.dataset.selectSound === selectedSound;
            button.setAttribute("aria-pressed", String(isSelected));
            button.classList.toggle("is-selected", isSelected);
        });
    }

    function playSiteSound(preview = false) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if ((!soundEnabled && !preview) || !AudioContextClass) {
            if (!AudioContextClass && soundSettingsStatus) {
                soundSettingsStatus.textContent = "Sunetul nu este acceptat de acest browser sau dispozitiv.";
            }
            return false;
        }

        try {
            audioContext ||= new AudioContextClass();

            if (audioContext.state === "suspended") {
                audioContext.resume().catch((error) => {
                    console.error("Redarea sunetului a fost blocată de browser.", error);
                    if (soundSettingsStatus) {
                        soundSettingsStatus.textContent = "Browserul a blocat sunetul. Apasă din nou previzualizarea sau verifică volumul dispozitivului.";
                    }
                });
            }

            const now = audioContext.currentTime;
            soundPresets[selectedSound].notes.forEach((note) => {
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();
                const startAt = now + (note.delay || 0);
                const endAt = startAt + note.duration;

                oscillator.type = note.type;
                oscillator.frequency.setValueAtTime(note.frequency, startAt);
                if (note.endFrequency !== note.frequency) {
                    oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, endAt);
                }
                gain.gain.setValueAtTime(note.volume, startAt);
                gain.gain.exponentialRampToValueAtTime(0.001, endAt);
                oscillator.connect(gain);
                gain.connect(audioContext.destination);
                oscillator.start(startAt);
                oscillator.stop(endAt);
            });
            return true;
        } catch (error) {
            console.error("Sunetul nu a putut fi redat pe acest dispozitiv.", error);
            if (soundSettingsStatus) {
                soundSettingsStatus.textContent = "Sunetul nu a putut fi redat. Verifică volumul dispozitivului și suportul audio al browserului.";
            }
            return false;
        }
    }

    soundChoices && Object.entries(soundPresets).forEach(([soundId, preset]) => {
        const choice = document.createElement("div");
        const selectButton = document.createElement("button");
        const icon = document.createElement("i");
        const name = document.createElement("span");
        const previewButton = document.createElement("button");
        const previewIcon = document.createElement("i");

        choice.className = "sound-choice";
        selectButton.className = "sound-choice-select";
        selectButton.type = "button";
        selectButton.dataset.selectSound = soundId;
        selectButton.dataset.soundControl = "";
        selectButton.setAttribute("aria-label", `Selectează sunetul ${preset.label}`);
        icon.className = `fa-solid ${preset.icon}`;
        icon.setAttribute("aria-hidden", "true");
        name.textContent = preset.label;
        selectButton.append(icon, name);

        previewButton.className = "sound-choice-preview";
        previewButton.type = "button";
        previewButton.dataset.soundControl = "";
        previewButton.setAttribute("aria-label", `Ascultă ${preset.label}`);
        previewIcon.className = "fa-solid fa-play";
        previewIcon.setAttribute("aria-hidden", "true");
        previewButton.appendChild(previewIcon);

        selectButton.addEventListener("click", () => {
            selectedSound = soundId;
            updateSoundButton();
            updateSoundChoiceButtons();

            try {
                localStorage.setItem("viteaClickSoundType", selectedSound);
                if (soundPickerStatus) soundPickerStatus.textContent = `Sunet selectat: ${preset.label}.`;
                if (soundSettingsStatus) soundSettingsStatus.textContent = `Sunet selectat: ${preset.label}.`;
            } catch (error) {
                console.error("Sunetul selectat nu a putut fi salvat.", error);
                if (soundPickerStatus) soundPickerStatus.textContent = "Sunetul s-a schimbat, dar nu a putut fi salvat în browser.";
            }
        });

        previewButton.addEventListener("click", () => {
            const previousSound = selectedSound;
            selectedSound = soundId;
            const didPlay = playSiteSound(true);
            selectedSound = previousSound;
            if (soundPickerStatus) {
                soundPickerStatus.textContent = didPlay
                    ? `Previzualizare: ${preset.label}.`
                    : "Sunetul nu a putut fi redat pe acest dispozitiv.";
            }
        });

        choice.append(selectButton, previewButton);
        soundChoices.appendChild(choice);
    });

    if (soundTypeSelect) {
        soundTypeSelect.value = selectedSound;
        soundTypeSelect.addEventListener("change", () => {
            selectedSound = soundPresets[soundTypeSelect.value] ? soundTypeSelect.value : "classic";
            updateSoundButton();
            updateSoundChoiceButtons();

            try {
                localStorage.setItem("viteaClickSoundType", selectedSound);
                if (soundSettingsStatus) {
                    soundSettingsStatus.textContent = `Sunet selectat: ${soundPresets[selectedSound].label}.`;
                }
            } catch (error) {
                console.error("Sunetul selectat nu a putut fi salvat.", error);
                if (soundSettingsStatus) {
                    soundSettingsStatus.textContent = "Sunetul a fost schimbat, dar nu a putut fi salvat în browser.";
                }
            }
        });
    }

    previewSoundButton?.addEventListener("click", () => {
        if (playSiteSound(true) && soundSettingsStatus) {
            soundSettingsStatus.textContent = `Previzualizare: ${soundPresets[selectedSound].label}.`;
        }
    });

    soundEnabledToggle?.addEventListener("change", () => {
        soundEnabled = soundEnabledToggle.checked;
        updateSoundButton();

        try {
            localStorage.setItem("viteaClickSound", String(soundEnabled));
            if (soundPickerStatus) {
                soundPickerStatus.textContent = soundEnabled
                    ? "Sunetele la apăsare sunt activate."
                    : "Sunetele la apăsare sunt dezactivate.";
            }
        } catch (error) {
            console.error("Starea sunetului nu a putut fi salvată.", error);
            if (soundPickerStatus) {
                soundPickerStatus.textContent = "Starea s-a schimbat, dar nu a putut fi salvată în browser.";
            }
        }

        if (soundEnabled) playSiteSound();
    });

    updateSoundButton();
    updateSoundChoiceButtons();

    soundHeaderButton?.addEventListener("click", () => {
        if (soundPickerStatus) {
            soundPickerStatus.textContent = `${soundEnabled ? "Sunet activat" : "Sunet dezactivat"} · ${soundPresets[selectedSound].label}.`;
        }
        openModal("soundPickerModal");
    });

    $("#quickSoundAction")?.addEventListener("click", () => {
        closeModal("quickFunctionsModal");
        if (soundPickerStatus) {
            soundPickerStatus.textContent = `${soundEnabled ? "Sunet activat" : "Sunet dezactivat"} · ${soundPresets[selectedSound].label}.`;
        }
        openModal("soundPickerModal");
    });

    $("#resetSettings")?.addEventListener("click", () => {
        if (!window.confirm("Resetezi culoarea, aspectul, accesibilitatea, notificările, sunetele și dimensiunea textului?")) {
            return;
        }

        settingsPersistenceFailed = false;
        try {
            setColor("#1683ff");
        } catch (error) {
            settingsPersistenceFailed = true;
            console.error("Culoarea a fost resetată doar pentru pagina curentă.", error);
        }
        setTheme(false);
        setHighContrast(false);
        setReducedMotion(false);
        try {
            setTextSize("medium");
        } catch (error) {
            settingsPersistenceFailed = true;
            document.body.classList.remove("text-small", "text-large", "text-extra");
            document.body.classList.add("text-medium");
            $$("[data-text-size]").forEach((button) => {
                button.classList.toggle("active", button.dataset.textSize === "medium");
            });
            console.error("Dimensiunea textului a fost resetată doar pentru pagina curentă.", error);
        }
        if (notificationToggle) notificationToggle.checked = true;
        try {
            localStorage.setItem("viteaNotifications", "on");
            localStorage.setItem("viteaClickSound", "false");
            localStorage.setItem("viteaClickSoundType", "classic");
        } catch (error) {
            settingsPersistenceFailed = true;
            console.error("Unele preferințe resetate nu au putut fi salvate.", error);
        }
        soundEnabled = false;
        selectedSound = "classic";
        if (soundTypeSelect) soundTypeSelect.value = selectedSound;
        updateSoundButton();
        updateSoundChoiceButtons();
        if (soundPickerStatus) soundPickerStatus.textContent = "Setările audio au fost resetate.";

        if (settingsStatus) {
            settingsStatus.textContent = settingsPersistenceFailed
                ? "Setările au fost resetate în pagină, dar unele nu au putut fi salvate în browser."
                : "Setările au fost readuse la valorile inițiale.";
        }
        showToast("✓", settingsPersistenceFailed
            ? "Setările au fost resetate temporar."
            : "Setările au fost resetate.");
    });

    document.addEventListener("click", (event) => {
        if (!soundEnabled || event.target.closest("[data-sound-control], #soundHeaderBtn, #quickSoundAction")) return;

        const interactive = event.target.closest("button, a[href], [role='button']");

        if (interactive) playSiteSound();
    }, true);

    refreshHeaderButton?.addEventListener("click", () => openModal("refreshModal"));
    $("#confirmSiteRefresh")?.addEventListener("click", () => window.location.reload());

    const quickFunctionTargets = {
        quickSearchAction: "searchHeaderBtn",
        quickTimeAction: "timeHeaderBtn",
        quickRefreshAction: "refreshHeaderBtn"
    };

    Object.entries(quickFunctionTargets).forEach(([actionId, headerButtonId]) => {
        document.getElementById(actionId)?.addEventListener("click", () => {
            closeModal("quickFunctionsModal");
            document.getElementById(headerButtonId)?.click();
        });
    });

}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSite, { once: true });
} else {
    initializeSite();
}

/* PROTECȚIE CONȚINUT */

document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
});

window.addEventListener("load", function () {
    const loader = document.getElementById("loader");
    if (loader) loader.classList.add("hidden");
}, { once: true });

document.addEventListener("selectstart", function (event) {
    event.preventDefault();
});

document.addEventListener("dragstart", function (event) {
    if (
        event.target.tagName === "IMG" ||
        event.target.tagName === "VIDEO"
    ) {
        event.preventDefault();
    }
});

/* Protecție pentru imagini */
document.querySelectorAll("img").forEach((img) => {
    img.setAttribute("draggable", "false");

    img.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });
});

/* Protecție pentru videoclipuri */
document.querySelectorAll("video").forEach((video) => {
    video.setAttribute("controlsList", "nodownload");

    video.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });
});

const ratingButtons = document.querySelectorAll("#ratingScale button");
const ratingResult = document.getElementById("ratingResult");
const contactForm = document.getElementById("contactForm");
const reviewForm = document.getElementById("reviewForm");
const contactMap = document.getElementById("contactMap");
const contactLayout = document.querySelector(".contact-layout");
const contactConfirmDialog = document.getElementById("contactConfirmDialog");
const contactConfirmTitle = document.getElementById("contactConfirmTitle");
const contactConfirmDescription = document.getElementById("contactConfirmDescription");
const contactConfirmClose = document.getElementById("contactConfirmClose");
const contactConfirmCancel = document.getElementById("contactConfirmCancel");
const contactConfirmProceed = document.getElementById("contactConfirmProceed");
const restoreContactBtn = document.getElementById("restoreContactBtn");
const clearReviewBtn = document.getElementById("clearReviewBtn");
const restoreReviewBtn = document.getElementById("restoreReviewBtn");
const reviewRatingButtons = document.querySelectorAll("#reviewRatingScale [data-review-rating]");
const reviewRatingResult = document.getElementById("reviewRatingResult");
const reviewMessage = document.getElementById("reviewMessage");
const reviewStatus = document.getElementById("reviewStatus");
const contactCompletedStorageKey = "viteaContactCompleted";
const reviewsStorageKey = "viteaReviews";
let pendingContactAction = null;
let contactRestoreSnapshot = null;
let reviewRestoreSnapshot = null;
let isReviewMode = localStorage.getItem(contactCompletedStorageKey) === "true";

function setReviewMode(enabled) {
    isReviewMode = enabled;
    contactForm.hidden = enabled;
    contactMap.hidden = false;
    reviewForm.hidden = !enabled;
    contactLayout.classList.toggle("review-mode", enabled);

    document.getElementById("contactSectionLabel").textContent = enabled ? "RECENZII" : "CONTACT";
    document.getElementById("contactSectionTitleText").textContent = enabled ? "Scrie o recenzie" : "Contactează-ne";
    const contactTitleIcon = document.getElementById("contactSectionTitleIcon");
    contactTitleIcon.className = `fa-solid ${enabled ? "fa-pen" : "fa-envelope"} spin-title-icon`;
    document.getElementById("contactSectionDescription").textContent = enabled
        ? "Scrie o recenzie. Împărtășește-ți părerea despre site și experiența ta."
        : "Trimite un mesaj.";

    document.querySelectorAll(".desktop-navigation [data-section='contact'], .bottom-navigation [data-section='contact']")
        .forEach((button) => {
            const label = button.querySelector("span, small");
            const icon = button.querySelector("i");
            if (label) label.textContent = enabled ? "Recenzii" : "Contact";
            if (icon) {
                icon.classList.toggle("fa-envelope", !enabled);
                icon.classList.toggle("fa-star", enabled);
            }
            button.setAttribute("aria-label", enabled ? "Recenzii" : "Contact");
        });
}

setReviewMode(isReviewMode);

if (window.location.hash === "#reviews") {
    setReviewMode(true);
    window.setTimeout(() => reviewForm?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
}

ratingButtons.forEach(button => {
    button.addEventListener("click", () => {

        ratingButtons.forEach(btn => {
            btn.classList.remove("selected");
        });

        button.classList.add("selected");

        const rating = button.dataset.rating;

        ratingResult.textContent =
            `Ai acordat site-ului nota ${rating}/10.`;
    });
});

const clearContactBtn = document.getElementById("clearContactBtn");

function openContactConfirmation(action) {
    pendingContactAction = action;

    const isSending = action === "send";
    const isReviewClear = action === "review-clear";
    contactConfirmTitle.textContent = isSending
        ? "Vrei să treci la recenzii?"
        : "Vrei să ștergi datele?";
    contactConfirmDescription.textContent = isSending
        ? "Formularul de contact va fi înlocuit cu cel de recenzii. Mesajul nu este trimis automat."
        : isReviewClear
            ? "Recenzia introdusă va fi ștearsă, dar o vei putea restaura imediat după."
            : "Datele introduse vor fi șterse, dar le vei putea restaura imediat după.";
    contactConfirmProceed.textContent = isSending ? "Continuă" : "Șterge datele";
    contactConfirmProceed.classList.toggle("is-destructive", !isSending);
    contactConfirmDialog.showModal();
}

function resetContactForm() {
    contactForm?.reset();
    ratingButtons.forEach((button) => button.classList.remove("selected"));
    if (ratingResult) {
        ratingResult.textContent = "Nu ai ales încă o notă.";
    }
}

function saveContactSnapshot() {
    const selectedRating = document.querySelector("#ratingScale button.selected");
    const snapshot = {
        name: document.getElementById("contactName")?.value ?? "",
        phone: document.getElementById("contactPhone")?.value ?? "",
        email: document.getElementById("contactEmail")?.value ?? "",
        message: document.getElementById("contactMessage")?.value ?? "",
        rating: selectedRating?.dataset.rating ?? ""
    };

    const hasData = Object.values(snapshot).some((value) => value !== "");
    contactRestoreSnapshot = hasData ? snapshot : null;
    restoreContactBtn.hidden = !hasData;
}

function runContactAction(action) {
    if (action === "review-clear") {
        const selectedRating = document.querySelector("#reviewRatingScale [data-review-rating].selected");
        const snapshot = {
            message: reviewMessage.value,
            rating: selectedRating?.dataset.reviewRating ?? ""
        };
        reviewRestoreSnapshot = Object.values(snapshot).some((value) => value !== "") ? snapshot : null;
        reviewForm.reset();
        reviewRatingButtons.forEach((button) => button.classList.remove("selected"));
        reviewRatingResult.textContent = "Nu ai ales încă o notă.";
        restoreReviewBtn.hidden = !reviewRestoreSnapshot;
        reviewStatus.textContent = "";
        window.showContactToast?.("✓", "Recenzia a fost ștearsă. O poți restaura.");
        return;
    }

    saveContactSnapshot();
    resetContactForm();

    if (action === "send") {
        localStorage.setItem(contactCompletedStorageKey, "true");
        setReviewMode(true);
        window.showContactToast?.("✓", "Acum poți scrie o recenzie. Mesajul de contact nu a fost trimis automat.");
    } else {
        window.showContactToast?.("✓", "Datele au fost șterse. Le poți restaura oricând.");
    }

    restoreContactBtn.hidden = !contactRestoreSnapshot;
}

clearContactBtn?.addEventListener("click", () => {
    openContactConfirmation("clear");
});

clearReviewBtn?.addEventListener("click", () => {
    openContactConfirmation("review-clear");
});

reviewRatingButtons.forEach((button) => {
    button.addEventListener("click", () => {
        reviewRatingButtons.forEach((ratingButton) => ratingButton.classList.remove("selected"));
        button.classList.add("selected");
        reviewRatingResult.textContent = `Ai acordat site-ului nota ${button.dataset.reviewRating}/10.`;
    });
});

reviewForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    reviewMessage.value = reviewMessage.value.trim();
    const selectedRating = document.querySelector("#reviewRatingScale [data-review-rating].selected");

    if (!reviewForm.reportValidity()) return;
    if (!selectedRating) {
        reviewRatingResult.textContent = "Alege o notă înainte să trimiți recenzia.";
        reviewRatingButtons[0]?.focus();
        return;
    }

    try {
        const savedReviews = JSON.parse(localStorage.getItem(reviewsStorageKey) || "[]");
        if (!Array.isArray(savedReviews)) {
            throw new TypeError("Lista recenziilor salvate nu este validă.");
        }

        savedReviews.push({
            rating: selectedRating.dataset.reviewRating,
            message: reviewMessage.value.trim(),
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(reviewsStorageKey, JSON.stringify(savedReviews));
    } catch (error) {
        reviewStatus.textContent = "Nu am putut salva recenzia în browser. Verifică spațiul disponibil și încearcă din nou.";
        console.error("Nu s-a putut salva recenzia.", error);
        return;
    }

    reviewForm.reset();
    reviewRatingButtons.forEach((button) => button.classList.remove("selected"));
    reviewRatingResult.textContent = "Nu ai ales încă o notă.";
    reviewStatus.textContent = "Recenzia a fost salvată pe acest dispozitiv.";
    window.showContactToast?.("✓", "Recenzia a fost salvată pe acest dispozitiv.");
});

restoreReviewBtn?.addEventListener("click", () => {
    if (!reviewRestoreSnapshot) return;

    reviewMessage.value = reviewRestoreSnapshot.message;
    reviewRatingButtons.forEach((button) => {
        const isSelected = button.dataset.reviewRating === reviewRestoreSnapshot.rating;
        button.classList.toggle("selected", isSelected);
    });
    reviewRatingResult.textContent = reviewRestoreSnapshot.rating
        ? `Ai acordat site-ului nota ${reviewRestoreSnapshot.rating}/10.`
        : "Nu ai ales încă o notă.";
    reviewRestoreSnapshot = null;
    restoreReviewBtn.hidden = true;
    window.showContactToast?.("↩", "Recenzia a fost reîntoarsă în formular.");
});

contactConfirmCancel?.addEventListener("click", () => {
    pendingContactAction = null;
    contactConfirmDialog.close();
});

contactConfirmClose?.addEventListener("click", () => {
    pendingContactAction = null;
    contactConfirmDialog.close();
});

contactConfirmDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    pendingContactAction = null;
});

contactConfirmProceed?.addEventListener("click", () => {
    const action = pendingContactAction;
    pendingContactAction = null;
    contactConfirmDialog.close();

    if (action) {
        runContactAction(action);
    }
});

restoreContactBtn?.addEventListener("click", () => {
    if (!contactRestoreSnapshot) return;

    document.getElementById("contactName").value = contactRestoreSnapshot.name;
    document.getElementById("contactPhone").value = contactRestoreSnapshot.phone;
    document.getElementById("contactEmail").value = contactRestoreSnapshot.email;
    document.getElementById("contactMessage").value = contactRestoreSnapshot.message;

    ratingButtons.forEach((button) => {
        const isSelected = button.dataset.rating === contactRestoreSnapshot.rating;
        button.classList.toggle("selected", isSelected);
    });

    if (ratingResult) {
        ratingResult.textContent = contactRestoreSnapshot.rating
            ? `Ai acordat site-ului nota ${contactRestoreSnapshot.rating}/10.`
            : "Nu ai ales încă o notă.";
    }

    contactRestoreSnapshot = null;
    restoreContactBtn.hidden = true;
    window.showContactToast?.("↩", "Datele au fost reîntoarse în formular.");
});
