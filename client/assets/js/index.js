const API_URL = '/';
const converter = new showdown.Converter();
let promptToRetry = null;
let uniqueIdToRetry = null;

const submitButton = document.getElementById('submit-button');
const regenerateResponseButton = document.getElementById('regenerate-response-button');
const promptInput = document.getElementById('prompt-input');
const modelSelect = document.getElementById('model-select');
const responseList = document.getElementById('response-list');
const fileInput = document.getElementById("whisper-file");

var features = {};
var input;
var imageAmount= 0;
var linkAmount = 0;
var check = false; 
console.log("hi");

// for parsing checkboxes
document.addEventListener("DOMContentLoaded", function() {



    submitButton.addEventListener("click", function() {

        console.log("in submit button listene")
        // var imageCheckbox = document.getElementById("imageOption");
         imageAmount = document.getElementById("imageCount").value;

        input = document.getElementById("text-input").value;



        // if (imageCheckbox.checked) {
        //     check = true; 
        //     console.log("Images: Yes " + imageAmount);
        //     features["image"] = [true, imageAmount]
        // } else {
        //     console.log("Images: No");
        //     features["image"] = [false, -1]
        // }

        getGPTResult();
        getImageCount();
        checkSelfIntroduction();

    });
});

modelSelect.addEventListener("change", function() {
    if (modelSelect.value === "whisper") {
        fileInput.style.display = "block";
        // Disable the input field when Whisper is selected
        promptInput.style.display = 'none';
    } else {
        fileInput.style.display = "none";
        // Enable the input field when Whisper is not selected
        promptInput.style.display = 'block';
    }
});

let isGeneratingResponse = false;

let loadInterval = null;

promptInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        if (event.ctrlKey || event.shiftKey) {
            document.execCommand('insertHTML', false, '<br/><br/>');
        } else {
            getGPTResult();
        }
    }
});

function generateUniqueId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
}


function addResponse(selfFlag, prompt) {
    const uniqueId = generateUniqueId();
    const html = `
            <div class="response-container ${selfFlag ? 'my-question' : 'chatgpt-response'}">
                <img class="avatar-image" src="assets/img/${selfFlag ? 'me' : 'chatgpt'}.png" alt="avatar"/>
                <div class="prompt-content" id="${uniqueId}">${prompt}</div>
            </div>
        `
    responseList.insertAdjacentHTML('beforeend', html);
    responseList.scrollTop = responseList.scrollHeight;
    return uniqueId;
}

function loader(element) {
    element.textContent = ''

    loadInterval = setInterval(() => {
        // Update the text content of the loading indicator
        element.textContent += '.';

        // If the loading indicator has reached three dots, reset it
        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);
}

function setErrorForResponse(element, message) {
    element.innerHTML = message;
    element.style.color = 'rgb(200, 0, 0)';
}

function setRetryResponse(prompt, uniqueId) {
    promptToRetry = prompt;
    uniqueIdToRetry = uniqueId;
    regenerateResponseButton.style.display = 'flex';
}

async function regenerateGPTResult() {
    try {
        await getGPTResult(promptToRetry, uniqueIdToRetry)
        regenerateResponseButton.classList.add("loading");
    } finally {
        regenerateResponseButton.classList.remove("loading");
    }
}

async function getWhisperResult() {
    if (!fileInput.files?.length) {
        return;
    }
    const formData = new FormData();
    formData.append("audio", fileInput.files[0]);
    const uniqueId = addResponse(false);
    const responseElement = document.getElementById(uniqueId);
    isGeneratingResponse = true;
    loader(responseElement);

    try {
        submitButton.classList.add("loading");
        const response = await fetch("/transcribe", {
            method: "POST",
            body: formData
        });
        if (!response.ok) {
            setErrorForResponse(responseElement, `HTTP Error: ${await response.text()}`);
            return;
        }
        const responseText = await response.text();
        responseElement.innerHTML = `<div>${responseText}</div>`
    } catch (e) {
        console.log(e);
        setErrorForResponse(responseElement, `Error: ${e.message}`);
    } finally {
        isGeneratingResponse = false;
        submitButton.classList.remove("loading");
        clearInterval(loadInterval);
    }
}

function showTooltip(tooltipId) {
    document.getElementById(tooltipId).style.display = 'block';
}

function hideTooltip(tooltipId) {
    document.getElementById(tooltipId).style.display = 'none';
}

function getImageCount() {

    var resultElement = document.getElementById('result-container-images');

    if (imageAmount == 0) {
        resultElement.textContent = "Doesn't seem like you have any images; you are good to go!";
        return;
    }

    const lowercasedInput = input.toLowerCase();
    const lowercasedTargetWord = "image"

    // Use a regular expression to find all occurrences of the target word
    const regex = new RegExp('\\b' + lowercasedTargetWord + '\\b', 'g');
    const matches = lowercasedInput.match(regex);

    // Return the count of occurrences
    const count = matches ? matches.length : 0;
    
    

    if (count == imageAmount) {
        console.log("equal amount");
        if (resultElement) {
            resultElement.textContent = "you added in your image descriptions!";
        }
    } else {
        console.log("you might be missing some image descriptions, ensure they are all htere");
        if (resultElement) {
            resultElement.textContent = "It seems you are missing some image descriptions, ensure they are all there";
        }
    }
}


// Function to get GPT result
async function checkSelfIntroduction(_promptToRetry, _uniqueIdToRetry) {
    submitButton.classList.add("loading");
    try {
        const model = "chatgpt"
        // Send a POST request to the API with the prompt in the request body
        const prompt = "does this presentation script have a self introduction where they are describing themselves including name, hair color, clothes, and gender: " + input + ". Answer with yes or no, and what parts they are missing. Be lenient, if they have one or the other it is fine.";
        const response = await fetch(API_URL + 'get-prompt-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                model
            })
        });
        if (!response.ok) {
            setRetryResponse(prompt, uniqueId);
        
            // Get additional details from the response
            let errorMessage = `HTTP Error: ${response.status} - ${response.statusText}`;
        
            try {
                // Attempt to parse the response body as JSON for more details
                const responseBody = await response.json();
                errorMessage += `\n${JSON.stringify(responseBody, null, 2)}`;
            } catch (error) {
                // If parsing as JSON fails, use the raw response text
                errorMessage += `\n${await response.text()}`;
            }
        
            setErrorForResponse(responseElement, errorMessage);
            return;
        }
        
        const responseText = await response.text();
            console.log(responseText);
            var resultElement = document.getElementById('result-container');
            if (resultElement) {
                resultElement.textContent = responseText;
            }
    } catch (err) {
    } finally {
    }
    
}

// Function to get GPT result
async function getGPTResult(_promptToRetry, _uniqueIdToRetry) {
    submitButton.classList.add("loading");

        try {
            const model = "chatgpt"
            // Send a POST request to the API with the prompt in the request body
            const num = imageAmount;
            const temperature = 1; // Set the desired temperature value
            const top_p = 1; // Set the desired top_p value
            const frequency_penalty = 0; // Set the desired frequency_penalty value
            const max_tokens = 1000; 
           const prompt = "does this prompt" + input +" has an existing acronym? do they mention what it stands for? if not, please mention what it stands for"
           const response = await fetch(API_URL + 'get-prompt-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model,
                    temperature,
                    max_tokens,
                    top_p,
                    frequency_penalty
                })
            });
            if (!response.ok) {
                setRetryResponse(prompt, uniqueId);
            
                // Get additional details from the response
                let errorMessage = `HTTP Error: ${response.status} - ${response.statusText}`;
            
                try {
                    // Attempt to parse the response body as JSON for more details
                    const responseBody = await response.json();
                    errorMessage += `\n${JSON.stringify(responseBody, null, 2)}`;
                } catch (error) {
                    // If parsing as JSON fails, use the raw response text
                    errorMessage += `\n${await response.text()}`;
                }
            
                setErrorForResponse(responseElement, errorMessage);
                return;
            }
            
            const responseTextA = await response.text();
            console.log(responseTextA);
                var resultElement = document.getElementById('result-container-1');
                if (resultElement) {
                    resultElement.textContent = responseTextA;
                }

        } catch (err) {
        } finally {
        }

   // }
     try {
        const model = "chatgpt"
        // Send a POST request to the API with the prompt in the request body
        const prompt = "does this prompt "+ input + " have a section where the speaker asks if the audience has any questions. Look for phrases like 'any questions?' or similar. Provide details if such a section is present.";
        const response = await fetch(API_URL + 'get-prompt-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                model
            })
        });
        if (!response.ok) {
            setRetryResponse(prompt, uniqueId);
        
            // Get additional details from the response
            let errorMessage = `HTTP Error: ${response.status} - ${response.statusText}`;
        
            try {
                // Attempt to parse the response body as JSON for more details
                const responseBody = await response.json();
                errorMessage += `\n${JSON.stringify(responseBody, null, 2)}`;
            } catch (error) {
                // If parsing as JSON fails, use the raw response text
                errorMessage += `\n${await response.text()}`;
            }
        
            setErrorForResponse(responseElement, errorMessage);
            return;
        }
        
        const responseTextB = await response.text();
            console.log(responseTextB);
            var resultElement = document.getElementById('result-container-2');
            if (resultElement) {
                resultElement.textContent = responseTextB;
            }
    } catch (err) {
    } finally {
    }
    try {
        const model = "chatgpt"
        // Send a POST request to the API with the prompt in the request body
        const prompt = "does this prompt "+ input + "use offensive words like disabled people. if the prompt does use these words, just tell user to use more inclusive language. Dont include 'disabled people' in your response too.";
        const response = await fetch(API_URL + 'get-prompt-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                model
            })
        });
        if (!response.ok) {
            setRetryResponse(prompt, uniqueId);
        
            // Get additional details from the response
            let errorMessage = `HTTP Error: ${response.status} - ${response.statusText}`;
        
            try {
                // Attempt to parse the response body as JSON for more details
                const responseBody = await response.json();
                errorMessage += `\n${JSON.stringify(responseBody, null, 2)}`;
            } catch (error) {
                // If parsing as JSON fails, use the raw response text
                errorMessage += `\n${await response.text()}`;
            }
        
            setErrorForResponse(responseElement, errorMessage);
            return;
        }
        
        const responseTextC = await response.text();
            console.log(responseTextC);
            var resultElement = document.getElementById('result-container-3');
            if (resultElement) {
                resultElement.textContent = responseTextC;
            }
    } catch (err) {
    } finally {
    }
    
}


submitButton.addEventListener("click", () => {
    getGPTResult();
});
regenerateResponseButton.addEventListener("click", () => {
    regenerateGPTResult();
});

document.addEventListener("DOMContentLoaded", function(){
    promptInput.focus();
});
