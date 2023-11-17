// import OpenAI from '/npm/openai/index.js';

const API_URL = '/';
const converter = new showdown.Converter();
let promptToRetry = null;
let uniqueIdToRetry = null;
let OPENAI_API_KEY = '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';
// const OpenAI = require('openai');

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

    // try {
    //     const model = "gpt-4-1106-preview"
    //     // Send a POST request to the API with the prompt in the request body
    //     const prompt = "does this presentation script have a self introduction where they are describing themselves including name, hair color, clothes, and gender: " + input + ". Answer with yes or no, and what parts they are missing. Be lenient, if they have one or the other it is fine.";
    //     const response = await fetch(API_URL + 'get-prompt-result', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({
    //             prompt,
    //             model
    //         })
    //     });
    //     if (!response.ok) {
    //         setRetryResponse(prompt, uniqueId);
        
    //         // Get additional details from the response
    //         let errorMessage = `HTTP Error: ${response.status} - ${response.statusText}`;
        
    //         try {
    //             // Attempt to parse the response body as JSON for more details
    //             const responseBody = await response.json();
    //             errorMessage += `\n${JSON.stringify(responseBody, null, 2)}`;
    //         } catch (error) {
    //             // If parsing as JSON fails, use the raw response text
    //             errorMessage += `\n${await response.text()}`;
    //         }
        
    //         setErrorForResponse(responseElement, errorMessage);
    //         return;
    //     }
        
    //     const responseText = await response.text();
    //     // if (model === 'image') {
    //     //     // Show image for `Create image` model
    //     //     responseElement.innerHTML = `<img src="${responseText}" class="ai-image" alt="generated image"/>`
    //     // } else {
    //         // Set the response text
    //         // -- parse and make changes
    //         //responseElement.innerHTML = converter.makeHtml(responseText.trim());
    //         console.log(responseText);
    //         var resultElement = document.getElementById('result-container');
    //         if (resultElement) {
    //             resultElement.textContent = responseText;
    //         }
    //     // }

    //     // promptToRetry = null;
    //     // uniqueIdToRetry = null;
    //     // regenerateResponseButton.style.display = 'none';
    //     // setTimeout(() => {
    //     //     // Scroll to the bottom of the response list
    //     //     responseList.scrollTop = responseList.scrollHeight;
    //     //     hljs.highlightAll();
    //     // }, 10);
    // } catch (err) {
    //     // setRetryResponse(prompt, uniqueId);
    //     // // If there's an error, show it in the response element
    //     // setErrorForResponse(responseElement, `Error: ${err.message}`);
    // } finally {
    //     // Set isGeneratingResponse to false
    //     // isGeneratingResponse = false;

    //     // // Remove the loading class from the submit button
    //     // submitButton.classList.remove("loading");

    //     // // Clear the loader interval
    //     // clearInterval(loadInterval);
    // }
    if(imageAmount > 0){
        try {
            // const OpenAI = require('openai');
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
              });
            console.log("in image descrption top");
            const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                "role": "system",
                "content": "can you look for the sentence bunches where the user is describing some sort of image (does not matter what). Group singular images together. How many images does it seem to be describing - just output the number individually as a digit(s)? "
                },
                {
                "role": "user",
                "content": input
                },
                {
                "role": "assistant"
                },
                {
                "role": "assistant",
                "content": "2"
                }
            ],
            temperature: 1,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            });
            console.log("in image descrption bottom");
            // const model = "gpt-4-1106-preview"
            // // Send a POST request to the API with the prompt in the request body
            // console.log(input);
            // //const prompt = "does this presentation have a sentence or phrase that are along the lines of 'this image has'. This is the sentence: "+ + input + "";
            // //const prompt = "does this content refer to an image or picture at least " + imageAmount + " times? Explain what the two are. Here is the content: " + input;
            // const prompt = "can you look for the sentence bunches where the user is describing some sort of image (does not matter what). Group singular images together. How many images does it seem to be describing? Output just the number in digit format. Say nothing else except the number. if you are struggling to find image descriptions, output 0. Here is their content: " + input;
            // const response = await fetch(API_URL + 'get-prompt-result', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         prompt,
            //         model
            //     })
            // });
            // if (!response.ok) {
            //     setRetryResponse(prompt, uniqueId);
            
            //     // Get additional details from the response
            //     let errorMessage = `HTTP Error: ${response.status} - ${response.statusText}`;
            
            //     try {
            //         // Attempt to parse the response body as JSON for more details
            //         const responseBody = await response.json();
            //         errorMessage += `\n${JSON.stringify(responseBody, null, 2)}`;
            //     } catch (error) {
            //         // If parsing as JSON fails, use the raw response text
            //         errorMessage += `\n${await response.text()}`;
            //     }
            
            //     setErrorForResponse(responseElement, errorMessage);
            //     return;
            // }

            console.log("in image descrition portion");
            console.log(response);
            
            const responseText = await response.text();
            // // if (model === 'image') {
            // //     // Show image for `Create image` model
            // //     responseElement.innerHTML = `<img src="${responseText}" class="ai-image" alt="generated image"/>`
            // // } else {
            //     // Set the response text
            //     // -- parse and make changes
            //     //responseElement.innerHTML = converter.makeHtml(responseText.trim());
                console.log(responseText);
                var resultElement = document.getElementById('result-container');
                if (resultElement) {
                    resultElement.textContent = responseText;
                }
            // // }
    
            // // promptToRetry = null;
            // // uniqueIdToRetry = null;
            // // regenerateResponseButton.style.display = 'none';
            // // setTimeout(() => {
            // //     // Scroll to the bottom of the response list
            // //     responseList.scrollTop = responseList.scrollHeight;
            // //     hljs.highlightAll();
            // // }, 10);
        } catch (err) {
            // setRetryResponse(prompt, uniqueId);
            // // If there's an error, show it in the response element
            // setErrorForResponse(responseElement, `Error: ${err.message}`);
            console.error("Error:", err);
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
