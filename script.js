async function analyzeCode() {
    const codeInput = document.getElementById("codeInput").value;
    const simulateAttack = document.getElementById("simulateAttack").checked;
    const resultBox = document.getElementById("result");

    resultBox.innerHTML = "Analyzing... ⏳";

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                code: codeInput,
                simulate_attack: simulateAttack
            })
        });

        const data = await response.json();

        let output = `<h3>Risk Score: ${data.risk_score}</h3>`;

        if (data.issues.length > 0) {
            output += "<h4>Issues Found:</h4><ul>";
            data.issues.forEach(issue => {
                output += `
                    <li>
                        <b>Type:</b> ${issue.type} <br>
                        <b>Severity:</b> ${issue.severity} <br>
                        <b>Fix:</b> ${issue.fix}
                    </li><br>
                `;
            });
            output += "</ul>";
        } else {
            output += "<p>✅ No vulnerabilities detected.</p>";
        }

        if (data.attack_simulation) {
            output += `<p style="color:red;"><b>${data.attack_simulation}</b></p>`;
        }

        resultBox.innerHTML = output;

    } catch (error) {
        resultBox.innerHTML = "❌ Error connecting to backend.";
    }
}