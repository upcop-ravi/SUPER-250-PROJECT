// This is your actual Sheet ID: 1VPD21zY1KbFAC9-OOdGKndZBy_YhYUMH7dbNm3U06Q4
// We hide it slightly using a simple string join to prevent easy scraping
const part1 = "1VPD21zY1KbFAC9-";
const part2 = "OOdGKndZBy_YhYUMH7dbNm3U06Q4";
const sheetID = part1 + part2;

const searchBtn = document.getElementById('searchBtn');
const keywordInput = document.getElementById('keyword');
const container = document.getElementById('cardContainer');

searchBtn.addEventListener('click', () => {
    const userInput = keywordInput.value.toLowerCase().trim();
    const selectedSheetName = document.querySelector('input[name="category"]:checked').value;

    // Constructing the URL
    const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${selectedSheetName}`;

    if (!userInput) {
        container.innerHTML = "<p style='color: orange; text-align: center;'>Please enter a keyword.</p>";
        return;
    }

    container.innerHTML = "<p style='text-align: center;'>Searching...</p>";

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.text();
        })
        .then(data => {
            // The Google API returns a string starting with "/*O_o*/google.visualization.Query.setResponse(...)"
            // We need to strip that out to get the JSON inside the parentheses
            const jsonStart = data.indexOf('{');
            const jsonEnd = data.lastIndexOf('}');
            const jsonString = data.substring(jsonStart, jsonEnd + 1);
            const json = JSON.parse(jsonString);

            const rows = json.table.rows;

            // Define headers from the first row (index 0)
            const headers = json.table.cols.map((col, index) => {
                return col.label ? col.label : `Field ${index + 1}`;
            });

            container.innerHTML = "";
            let foundAnyMatch = false;

            rows.forEach(row => {
                const rowMatches = row.c.some(cell => {
                    if (!cell || cell.v === null) return false;
                    return cell.v.toString().toLowerCase().includes(userInput);
                });

                if (rowMatches) {
                    foundAnyMatch = true;
                    const card = document.createElement("div");
                    card.className = "card";

                    let cardContent = "";
                    row.c.forEach((cell, index) => {
                        const labelText = headers[index];
                        const value = (cell && cell.v !== null) ? cell.v : "N/A";

                        cardContent += `
                            <div>
                                <span class="data-label">${labelText}</span>
                                <span class="data-value">${value}</span>
                            </div>`;
                    });

                    card.innerHTML = cardContent;
                    container.appendChild(card);
                }
            });

            if (!foundAnyMatch) {
                container.innerHTML = `<div style="text-align:center; color:red; font-weight:bold; width:100%; padding: 20px;">NO DATA FOUND RELATED TO YOUR SEARCH</div>`;
            }
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            container.innerHTML = `<p style='color:red; text-align:center;'>Error: ${err.message}. <br> Make sure your Sheet is set to 'Anyone with the link' and the tab names (Sheet1, etc.) match.</p>`;
        });
});