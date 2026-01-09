import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [poopCount, setPoopCount] = useState(() =>
      Number(localStorage.getItem("poop_counter")) || 0
  );

  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem("poop_date");
    return saved ? new Date(saved) : new Date(today);
  });

  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem("start_date");
    return saved ? new Date(saved) : new Date(today);
  });

  const [darkMode, setDarkMode] = useState(() =>
      localStorage.getItem("dark_mode") === "true"
  );

  const [monthlySummary, setMonthlySummary] = useState(() =>
      JSON.parse(localStorage.getItem("monthly_summary")) || {}
  );

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const dateToString = (date) => dateToLocalString(date);

    localStorage.setItem("poop_counter", poopCount);
    localStorage.setItem("poop_date", dateToString(selectedDate));
    localStorage.setItem("start_date", dateToString(startDate));
    localStorage.setItem("dark_mode", darkMode);
    localStorage.setItem("monthly_summary", JSON.stringify(monthlySummary));
  }, [poopCount, selectedDate, startDate, darkMode, monthlySummary]);

  const formatMonthName = (monthKey) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  };

  const formatFullDate = (dateObj) => {
    return dateObj.toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const dateToString = (dateObj) => dateToLocalString(dateObj);

  const dateToLocalString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };


  const handleAddOne = (dateStr) => {
    const dateObj = new Date(dateStr);
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;

    if (poopCount === 0) {
      const newStart = new Date(dateObj);
      newStart.setHours(0, 0, 0, 0);
      setStartDate(newStart);
    }

    setPoopCount(prev => prev + 1);

    setMonthlySummary(prev => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        [dateStr]: (prev[monthKey]?.[dateStr] || 0) + 1
      }
    }));
  };

  const handleRemoveOne = (monthKey, dateStr) => {
    setMonthlySummary(prev => {
      const updated = { ...prev };
      const monthData = updated[monthKey];

      if (!monthData || !monthData[dateStr]) return prev;

      if (monthData[dateStr] > 1) {
        monthData[dateStr]--;
      } else {
        delete monthData[dateStr];
      }

      if (Object.keys(monthData).length === 0) {
        delete updated[monthKey];
      }

      const totalRemaining = Object.values(updated)
          .flatMap(m => Object.values(m))
          .reduce((a, b) => a + b, 0);
      setPoopCount(totalRemaining);

      return updated;
    });
  };

  const handleAdd = () => {
    handleAddOne(dateToString(selectedDate));
  };

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(selectedDate.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(new Date(today));
  };

  const parseLocalDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };


  // Eksport do .txt
  const exportData = () => {
    let text = `Licznik Kup 💩 - Eksport danych\n`;
    text += `Data eksportu: ${new Date().toLocaleDateString("pl-PL")}\n`;
    text += `Łączna liczba kup: ${poopCount}\n\n`;

    const sortedMonths = Object.keys(monthlySummary).sort((a, b) => b.localeCompare(a));

    for (const monthKey of sortedMonths) {
      const monthData = monthlySummary[monthKey];
      const total = Object.values(monthData).reduce((a, b) => a + b, 0);
      text += `${formatMonthName(monthKey)} - ${total} kup\n`;

      const dayEntries = Object.entries(monthData).sort((a, b) => b[0].localeCompare(a[0]));
      for (const [date, count] of dayEntries) {
        const formatted = parseLocalDate(date).toLocaleDateString("pl-PL", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        text += `  📅 ${formatted}: ${count} × 💩\n`;
      }
      text += `\n`;
    }

    text += `Dane zapisane tylko lokalnie w przeglądarce.\nNikt poza Tobą ich nie widzi.`;

    // ✅ UTF-8 + BOM (polskie znaki)
    const blob = new Blob(
        ["\uFEFF" + text],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `licznik-kup-export-${new Date().getFullYear()}.txt`;
    document.body.appendChild(a); // 🔴 KLUCZOWE
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Wykres
  const availableYears = [
    ...new Set(Object.keys(monthlySummary).map(k => k.split("-")[0]))
  ].sort().reverse();


  const sortedMonthsAsc = Object.keys(monthlySummary)
      .filter(m => m.startsWith(selectedYear + "-"))
      .sort();
  const chartLabels = sortedMonthsAsc.map(m => formatMonthName(m));
  const chartDataValues = sortedMonthsAsc.map(m => Object.values(monthlySummary[m]).reduce((a, b) => a + b, 0));

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Liczba kup w miesiącach",
        font: { size: 18 },
        color: darkMode ? "#fff" : "#333",
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: darkMode ? "#ccc" : "#555" }, grid: { color: darkMode ? "#444" : "#eee" } },
      x: { ticks: { color: darkMode ? "#ccc" : "#555" }, grid: { color: darkMode ? "#444" : "#eee" } },
    },
  };

  const chartData = {
    labels: chartLabels,
    datasets: [{
      data: chartDataValues,
      backgroundColor: darkMode ? "#28a745" : "rgba(40, 167, 69, 0.8)",
      borderColor: "#28a745",
      borderWidth: 2,
    }],
  };

  const sortedMonthsDesc = Object.keys(monthlySummary).sort((a, b) => b.localeCompare(a));

  return (
      <div className={`min-vh-100 py-3 py-md-5 ${darkMode ? "bg-dark text-light" : "bg-light"}`}>
        <div className="container px-3 px-md-4">
          <div className={`card shadow ${darkMode ? "bg-black text-light border-secondary" : "bg-white"}`}>
            <div className="card-body p-3 p-md-5">

              {/* Nagłówek */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="d-flex align-items-center">
                    <img
                        src="/logo.png"
                        alt="💩"
                        style={{width: "80px", height: "80px", marginRight: "15px"}}
                    />
                    <h1 className="h3 fw-bold mb-0">Licznik Kup</h1>
                  </div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="darkSwitch" checked={darkMode}
                         onChange={() => setDarkMode(!darkMode)}/>
                  <label className="form-check-label" htmlFor="darkSwitch">🌙 Nocny</label>
                </div>
              </div>

              {/* Główna liczba */}
              <div className="text-center mb-4 py-3 rounded" style={{background: darkMode ? "#111" : "#f8f9fa"}}>
                <h2 className="text-muted small mb-2">Łączna liczba kup</h2>
                <div className="display-4 fw-bold text-success">{poopCount}</div>
              </div>

              {/* Data */}
              <div className="card mb-4 border-0 shadow-sm">
                <div className="card-body p-3">
                  <h5 className="text-center mb-3">Data kupy</h5>
                  <div className="d-flex flex-column gap-3 align-items-center mb-3">
                    <div className="d-flex gap-2 w-100 justify-content-center flex-wrap">
                      <button
                          onClick={goToPreviousDay}
                          className="btn btn-outline-primary btn-sm flex-fill"
                      >
                        ← Poprzedni
                      </button>

                      <button onClick={goToToday} className="btn btn-primary btn-sm">Dzisiaj</button>
                      <button onClick={goToNextDay} className="btn btn-outline-primary btn-sm flex-fill">
                        Następny →
                      </button>
                    </div>
                    <div className="text-center fw-bold">{formatFullDate(selectedDate)}</div>
                  </div>
                  <div className="text-center mb-3">
                  <small className="text-muted">Dowolny dzień (nawet przyszły)</small>
                  </div>
                  <div className="text-center">
                    <button onClick={handleAdd} className="btn btn-success w-100">Dodaj kupę 💩</button>
                  </div>
                </div>
              </div>

              {/* Podsumowanie */}
              <h4 className="text-center mb-3">Podsumowanie miesięczne</h4>

              {sortedMonthsDesc.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <p>Brak danych – dodaj pierwszą kupę!</p>
                  </div>
              ) : (
                  <>
                    <div className="accordion mb-4">
                      {sortedMonthsDesc.map((monthKey) => {
                        const monthData = monthlySummary[monthKey];
                        const totalInMonth = Object.values(monthData).reduce((a, b) => a + b, 0);
                        const dayEntries = Object.entries(monthData).sort((a, b) => b[0].localeCompare(a[0]));

                        return (
                            <div className="accordion-item border mb-2" key={monthKey}>
                              <h2 className="accordion-header">
                                <button
                                    className={`accordion-button collapsed fw-bold small ${darkMode ? "bg-dark text-light" : "bg-light"}`}
                                    type="button" data-bs-toggle="collapse" data-bs-target={`#collapse-${monthKey}`}>
                                  {formatMonthName(monthKey)}
                                  <span className="badge bg-success ms-auto">{totalInMonth} kup</span>
                                </button>
                              </h2>
                              <div id={`collapse-${monthKey}`} className="accordion-collapse collapse">
                                <div className={`accordion-body p-0 ${darkMode ? "bg-black" : "bg-white"}`}>
                                  {dayEntries.map(([date, count]) => (
                                      <div key={date}
                                           className={`d-flex justify-content-between align-items-center p-3 border-bottom ${darkMode ? "border-secondary" : "border-light"}`}>
                                        <span
                                            className="small fw-medium">📅 {new Date(date).toLocaleDateString("pl-PL", {
                                          day: "numeric",
                                          month: "long"
                                        })}</span>
                                        <div className="d-flex align-items-center gap-2">
                                          <button onClick={() => handleAddOne(date)}
                                                  className="btn btn-success btn-sm">+1
                                          </button>
                                          <div className="badge bg-primary px-3 py-2">{count} 💩</div>
                                          <button onClick={() => handleRemoveOne(monthKey, date)}
                                                  className="btn btn-danger btn-sm">−1
                                          </button>
                                        </div>
                                      </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>

                    <h5 className="text-center mb-3">Porównanie miesięcy</h5>

                    <div className="d-flex justify-content-center mb-2">
                      <select
                          className="form-select w-auto"
                          value={selectedYear}
                          onChange={e => setSelectedYear(e.target.value)}
                      >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div className={`rounded shadow-sm p-3 ${darkMode ? "bg-black" : "bg-light"}`}
                         style={{height: "300px"}}>
                      <Bar options={chartOptions} data={chartData}/>
                    </div>

                  </>
              )}

              {/* Eksport danych */}
              {poopCount > 0 && (
                  <div className="text-center mt-4">
                    <button onClick={exportData} className="btn btn-outline-info">
                      📄 Eksportuj dane do pliku .txt
                    </button>
                  </div>
              )}

              {/* FAQ */}
              {/* DŁUGIE FAQ DLA SEO – Z WIECEJ EMOJI I ZACHĘTĄ 😄 */}
              <div className="mt-5">
                <h4 className="text-center mb-4">FAQ 💩 – Najczęściej zadawane pytania o Licznik Kup! 🚽</h4>
                <p className="text-center mb-4 text-muted">Czy wiesz wszystko o swojej aplikacji do liczenia kup? Sprawdź poniżej – przydatne info! 😂</p>
                <div className="accordion" id="faqAccordion">
                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                        💩 Co to jest Licznik Kup i jak działa ta zabawna aplikacja do liczenia kup? 🚀
                      </button>
                    </h2>
                    <div id="faq1" className="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Hej! 👋 Licznik Kup to super prosta, całkowicie darmowa aplikacja internetowa, która pomaga śledzić liczbę kup w ciągu dnia, miesiąca i całego roku! 📅💩 Możesz dodawać kupę na dowolny dzień (nawet na przyszły – planuj z wyprzedzeniem! 😏), edytować historię (+1 lub −1), oglądać szczegółowe statystyki miesięczne i fajny wykres porównujący miesiące 📊. Wszystko działa w przeglądarce, jest mega responsywne i idealnie nadaje się do codziennego śledzenia nawyków toaletowych. Super intuicyjne: wybierz datę, kliknij „Dodaj kupę” i bum – statystyki rosną! 🌟 Spróbuj sam, zobaczysz jak wciąga! 😂
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">
                        🔒 Czy dane w Liczniku Kup są prywatne? Gdzie zapisywane są moje statystyki kup? 😌
                      </button>
                    </h2>
                    <div id="faq2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Spokojnie, 100% prywatności! 🛡️🔒 Wszystkie dane o Twoich kupach (liczba kup, daty, statystyki miesięczne) zapisują się wyłącznie lokalnie w Twojej przeglądarce dzięki localStorage. Nic, absolutnie nic nie jest wysyłane na żaden serwer, bazę danych czy chmurę! ☁️❌ Nikt poza Tobą nie zobaczy Twojego licznika kup – nawet my nie mamy dostępu! 😎 Jeśli wyczyścisz historię przeglądarki albo użyjesz trybu incognito – wszystko zniknie. To idealne rozwiązanie dla wszystkich, którzy cenią sobie prywatność w śledzeniu codziennych nawyków toaletowych. Bezpieczne jak sejf! 💪
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">
                        📄 Jak eksportować dane z Licznika Kup do pliku lub Notatek na telefonie? 📱
                      </button>
                    </h2>
                    <div id="faq3" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Prościzna! 😄 Kliknij przycisk „Eksportuj dane do pliku .txt” – od razu pobierze się czytelny plik tekstowy z pełną historią: łączna liczba kup, podsumowanie każdego miesiąca i lista wszystkich dni z liczbą kup! 💩📊 Plik możesz otworzyć w Notatkach na iPhone, Androidzie, na komputerze czy w dowolnym edytorze tekstu. Super sposób na backup swoich statystyk kup albo przeniesienie ich na inne urządzenie! 📲 Eksport zawiera też datę, więc zawsze wiesz, kiedy zrobiłeś kopię. Spróbuj – to tylko jedno kliknięcie! 🚀
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq4">
                        📱 Czy Licznik Kup działa offline i na telefonie? Super ważne pytanie! 😉
                      </button>
                    </h2>
                    <div id="faq4" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Oczywiście, że tak! 🌟 Po pierwszym załadowaniu aplikacja działa całkowicie offline – dane są lokalne, więc nie potrzebujesz internetu! 📶❌ Na telefonie wygląda rewelacyjnie: responsywny design, duże przyciski, łatwa nawigacja po datach. Możesz używać licznika kup wszędzie – w domu, w podróży, w toalecie (oczywiście! 😂). Idealny do codziennego śledzenia kup bez żadnych ograniczeń. Po prostu otwórz w przeglądarce i działaj! 📱💨
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq5">
                        ➕ Jak dodać kupę na przyszły dzień lub edytować historię w Liczniku Kup? 🗓️
                      </button>
                    </h2>
                    <div id="faq5" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Łatwizna! 😎 Użyj strzałek ← →, żeby wybrać dowolną datę (wstecz aż do pierwszej kupy, w przód – bez końca, nawet na przyszły rok!). Kliknij duży zielony przycisk „Dodaj kupę” albo w podsumowaniu miesięcznym użyj małych przycisków +1 💩 lub −1 przy konkretnym dniu. Możesz planować kupę z wyprzedzeniem albo poprawiać stare wpisy – wszystko aktualizuje się natychmiast! 📈 Statystyki kup, wykres i łączna liczba zmieniają się na bieżąco. Super zabawa i pełna kontrola nad historią! 🎉
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h2 className="accordion-header">
                      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq6">
                        🆓 Czy Licznik Kup jest darmowy, bezpieczny i bez reklam? 🎁
                      </button>
                    </h2>
                    <div id="faq6" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Tak, tak i jeszcze raz tak! 🥳 Całkowicie darmowy, bez żadnych reklam, rejestracji, subskrypcji czy ukrytych opłat. Nie zbieramy żadnych danych – wszystko zostaje tylko u Ciebie w przeglądarce. To prosty, zabawny licznik kup stworzony z czystej pasji do statystyk codziennych nawyków! 😄 Bezpieczny, prywatny i zawsze gotowy do użycia. Po prostu otwórz i licz kupki – zero stresu, maksimum frajdy! 🚽✨
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default App;