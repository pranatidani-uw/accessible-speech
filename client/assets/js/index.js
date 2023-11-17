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
console.log("hi");

// for parsing checkboxes
document.addEventListener("DOMContentLoaded", function() {



    submitButton.addEventListener("click", function() {

        console.log("in submit button listene")
        var imageCheckbox = document.getElementById("imageOption");
        var linkCheckbox = document.getElementById("links");

         imageAmount = document.getElementById("imageCount").value;
         linkAmount = document.getElementById("linkCount").value;

        input = document.getElementById("text-input").value;



        if (imageCheckbox.checked) {
            console.log("Images: Yes " + imageAmount);
            features["image"] = [true, imageAmount]
        } else {
            console.log("Images: No");
            features["image"] = [false, -1]
        }

        if (linkCheckbox.checked) {
            console.log("Links: Yes " + linkAmount);
            features["link"] = [true, linkAmount]
        } else {
            console.log("Links: No");
            features["link"] = [false, -1]
        }

        getGPTResult();

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

// Function to get GPT result
async function getGPTResult(_promptToRetry, _uniqueIdToRetry) {
    // if (modelSelect.value === 'whisper') {
    //     await getWhisperResult();
    //     return;
    // }
    // Get the prompt input
    // const prompt = _promptToRetry ?? promptInput.textContent;

    // If a response is already being generated or the prompt is empty, return
    // if (isGeneratingResponse || !prompt) {
    //     return;
    // }

    // Add loading class to the submit button
    submitButton.classList.add("loading");

    // Clear the prompt input
    // promptInput.textContent = '';

    // if (!_uniqueIdToRetry) {
    //     // Add the prompt to the response list
    //     addResponse(true, `<div>${prompt}</div>`);
    // }

    // // Get a unique ID for the response element
    // const uniqueId = _uniqueIdToRetry ?? addResponse(false);

    // // Get the response element
    // const responseElement = document.getElementById(uniqueId);

    // // Show the loader
    // loader(responseElement);

    // // Set isGeneratingResponse to true
    // isGeneratingResponse = true;

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
        // if (model === 'image') {
        //     // Show image for `Create image` model
        //     responseElement.innerHTML = `<img src="${responseText}" class="ai-image" alt="generated image"/>`
        // } else {
            // Set the response text
            // -- parse and make changes
            //responseElement.innerHTML = converter.makeHtml(responseText.trim());
            console.log(responseText);
            var resultElement = document.getElementById('result-container');
            if (resultElement) {
                resultElement.textContent = responseText;
            }
        // }

        // promptToRetry = null;
        // uniqueIdToRetry = null;
        // regenerateResponseButton.style.display = 'none';
        // setTimeout(() => {
        //     // Scroll to the bottom of the response list
        //     responseList.scrollTop = responseList.scrollHeight;
        //     hljs.highlightAll();
        // }, 10);
    } catch (err) {
        // setRetryResponse(prompt, uniqueId);
        // // If there's an error, show it in the response element
        // setErrorForResponse(responseElement, `Error: ${err.message}`);
    } finally {
        // Set isGeneratingResponse to false
        // isGeneratingResponse = false;

        // // Remove the loading class from the submit button
        // submitButton.classList.remove("loading");

        // // Clear the loader interval
        // clearInterval(loadInterval);
    }
    if(imageAmount > 0){
        try {
            const model = "chatgpt"
            // Send a POST request to the API with the prompt in the request body
            
            const prompt = "no matter what the images are, does this presentation have " +imageAmount + " descriptions for images"+ + input + ". an image description starts with 'this image shows' or something similar how many descriptions they are missing. consider each time the prompt includes 'this image shows' as one image description. you dont need t know what the image looks like. just make sure there's a description of the image that starts with 'this image contains' or smth very similar ";
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
            // if (model === 'image') {
            //     // Show image for `Create image` model
            //     responseElement.innerHTML = `<img src="${responseText}" class="ai-image" alt="generated image"/>`
            // } else {
                // Set the response text
                // -- parse and make changes
                //responseElement.innerHTML = converter.makeHtml(responseText.trim());
                console.log(responseText);
                var resultElement = document.getElementById('result-container');
                if (resultElement) {
                    resultElement.textContent = responseText;
                }
            // }
    
            // promptToRetry = null;
            // uniqueIdToRetry = null;
            // regenerateResponseButton.style.display = 'none';
            // setTimeout(() => {
            //     // Scroll to the bottom of the response list
            //     responseList.scrollTop = responseList.scrollHeight;
            //     hljs.highlightAll();
            // }, 10);
        } catch (err) {
            // setRetryResponse(prompt, uniqueId);
            // // If there's an error, show it in the response element
            // setErrorForResponse(responseElement, `Error: ${err.message}`);
        } finally {
            // Set isGeneratingResponse to false
            // isGeneratingResponse = false;
    
            // // Remove the loading class from the submit button
            // submitButton.classList.remove("loading");
    
            // // Clear the loader interval
            // clearInterval(loadInterval);
        }

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
