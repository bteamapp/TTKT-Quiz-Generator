import { GoogleGenAI } from "@google/genai";

// Declare global libraries from CDN
declare var mammoth: any;
declare var pdfjsLib: any;

// --- DOM ELEMENTS ---
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const quizInput = document.getElementById('quiz-input') as HTMLTextAreaElement;
const quizOutput = document.getElementById('quiz-output') as HTMLTextAreaElement;
const loadingIndicator = document.getElementById('loading-indicator') as HTMLDivElement;
const outputContainer = document.getElementById('output-container') as HTMLDivElement;
const errorContainer = document.getElementById('error-container') as HTMLDivElement;
const modeConvertBtn = document.getElementById('mode-convert') as HTMLButtonElement;
const modeGenerateBtn = document.getElementById('mode-generate') as HTMLButtonElement;
const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const inputLabel = document.getElementById('input-label') as HTMLLabelElement;


// --- STATE ---
let currentMode: 'convert' | 'generate' = 'convert';
// A variable to hold content from file uploads, which might be text or images for OCR
let uploadedContent: { type: 'text', data: string } | { type: 'images', data: { mimeType: string, data: string }[] } | null = null;
let originalGenerateBtnText = ''; // To store the button text before loading


// --- AI SETUP ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CONVERT_SYSTEM_PROMPT = `Bạn là một trợ lý soạn thảo mã HTML chuyên nghiệp cho bài kiểm tra "Trắc nghiệm TTKT". Hãy chuyển đổi nội dung tôi cung cấp dưới đây (có thể là văn bản hoặc hình ảnh) thành mã HTML, tuân thủ cực kỳ nghiêm ngặt các quy tắc sau:
1. Dòng đầu tiên bắt buộc là thẻ <p>[kiemtraquiz]</p>.
2. Mọi dòng thông tin (Câu hỏi, Lựa chọn) phải nằm trong một thẻ <p> riêng biệt.
3. Quan trọng: Tất cả đáp án đúng phải được tổng hợp vào một thẻ <p>[dapan=...] duy nhất đặt ở cuối cùng. Các đáp án cho từng câu phải được ngăn cách nhau bằng dấu phẩy (,) không có khoảng trắng. Không sử dụng dấu sao * nếu đã dùng thẻ đáp án. Ví dụ: <p>[dapan=1A,2B,3C,4:2136,5SD]</p>. Đề bài chỉ được một thẻ <p>, nếu có thông tin cho riêng một câu thì dùng [chitiet], nếu ngữ liệu chung hay đề bài chung thì dùng [nhom]
4. Phân tích loại câu hỏi:
+ Nếu câu hỏi có các lựa chọn A, B, C, D và một đáp án đúng, hãy định dạng đáp án trong thẻ dapan là SốCâuĐápÁn (ví dụ: 1A).
+ Nếu câu hỏi yêu cầu điền từ và đáp án đúng được cho trong ngoặc đơn, hãy định dạng là SốCâu:Đápán (ví dụ: 2:Hồ Chí Minh).
+ Nếu câu hỏi yêu cầu xác định Đúng/Sai cho các nhận định và đáp án được cho dưới dạng chuỗi (ví dụ: "Đáp án đúng: Sai, Đúng"), hãy định dạng là SốCâuChuỗiDS (ví dụ 3SD, không có dấu hai chấm giữa số câu và đáp án).
5. Ngữ Liệu Dùng Chung Cho Nhiều Câu Hỏi (Thẻ [nhom]) Sử dụng khi có một đoạn văn, hình ảnh, video... làm ngữ liệu cho một nhóm nhiều câu hỏi. Bắt đầu khối ngữ liệu bằng thẻ <p>[nhom]</p>. Thêm toàn bộ nội dung ngữ liệu (văn bản, thẻ <img>, <iframe>...). Kết thúc khối bằng thẻ <p>[/nhom]</p>. Đặt tất cả các câu hỏi liên quan ngay sau thẻ <p>[nhom]</p>.
6. Ngữ Liệu Riêng Cho Một Câu Hỏi (Thẻ [chitiet]) - Sử dụng khi bạn cần cung cấp ngữ liệu (ví dụ: một phương trình hóa học, một dòng code) chỉ cho một câu hỏi duy nhất. Quy tắc: Tương tự thẻ [nhom], nhưng nội dung bên trong [chitiet] sẽ luôn đi kèm với câu hỏi ngay sau nó, kể cả khi bài quiz bị xáo trộn.
7. Cần thêm <p>[tln]</p> sau đề bài câu trả lời ngắn để đảm bảo câu trả lời ngắn hiển thị ô nhập. Câu trả lời ngắn chỉ nên cho học sinh điền số (số tự nhiên hoặc số thập phân) để đảm bảo chấm đúng.
8. Nội dung câu hỏi và đáp án HOÀN TOÀN SUPPORT các thẻ in đậm <b> hay <strong> hay in nghiêng <i>, nếu đề bài cần in đậm hay in nghiêng thì có thể dùng các thẻ này ngay trong câu hỏi hay đáp án hoặc đưa nội dung vào phần <p>[chitiet]</p> thay vì đặt luôn trong đề bài hay đáp án.
9. Thẻ mở, ví dụ <p>[nhom]</p> hoặc <p>[chitiet]</p>, phải nằm trên một dòng <p> riêng. Toàn bộ nội dung ngữ liệu phải nằm giữa thẻ mở và thẻ đóng. Thẻ đóng, ví dụ <p>[/nhom]</p> hoặc <p>[/chitiet]</p>, cũng phải nằm trên một dòng <p> riêng. 
10. Nội dung của thẻ chi tiết phải nằm sau Đề bài\\câu hỏi và nằm trước đáp án để hệ thống gán đúng nội dung cho từng câu hỏi, tránh lỗi khi xáo trộn.
11. Giữ nguyên chính xác 100% nội dung câu hỏi. Chỉ xuất ra mã HTML, không chèn thêm CSS hay JavaScript.
12. Nếu bạn gặp một hình ảnh trong nội dung gốc, hãy chèn thẻ <p>[Hình ảnh]</p> vào vị trí tương ứng trong mã HTML đầu ra. Đừng cố gắng mô tả hình ảnh.`;

const GENERATE_SYSTEM_PROMPT = `Bạn là một AI chuyên tạo bài kiểm tra. Dựa vào nội dung tài liệu được cung cấp (văn bản hoặc hình ảnh), hãy tạo một bài kiểm tra trắc nghiệm gồm 10 câu hỏi để đánh giá sự hiểu biết về nội dung đó.
QUAN TRỌNG: Sau khi tạo xong các câu hỏi, hãy định dạng toàn bộ bài kiểm tra thành mã HTML theo các quy tắc nghiêm ngặt sau đây:\n` + CONVERT_SYSTEM_PROMPT;


// --- FUNCTIONS ---
const toggleLoading = (isLoading: boolean, message?: string) => {
    const defaultMessage = currentMode === 'convert' ? 'Converting to HTML...' : 'Generating your quiz...';
    loadingIndicator.querySelector('p')!.textContent = message || defaultMessage;
    loadingIndicator.classList.toggle('hidden', !isLoading);

    generateBtn.disabled = isLoading;
    if (isLoading) {
        // Store original text and show processing message
        originalGenerateBtnText = generateBtn.textContent || '';
        generateBtn.textContent = 'Processing...';
    } else {
        // Restore original text
        generateBtn.textContent = originalGenerateBtnText;
    }

    quizInput.disabled = isLoading;
    uploadBtn.disabled = isLoading;
    modeConvertBtn.disabled = isLoading;
    modeGenerateBtn.disabled = isLoading;
};

const displayError = (message: string) => {
    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
};

const clearError = () => {
    errorContainer.textContent = '';
    errorContainer.classList.add('hidden');
};

const switchMode = (newMode: 'convert' | 'generate') => {
    currentMode = newMode;
    if (newMode === 'convert') {
        modeConvertBtn.classList.add('active');
        modeConvertBtn.setAttribute('aria-pressed', 'true');
        modeGenerateBtn.classList.remove('active');
        modeGenerateBtn.setAttribute('aria-pressed', 'false');
        inputLabel.textContent = 'Quiz Content';
        quizInput.placeholder = 'Paste your questions and answers here...';
        generateBtn.textContent = 'Convert to HTML';
    } else {
        modeGenerateBtn.classList.add('active');
        modeGenerateBtn.setAttribute('aria-pressed', 'true');
        modeConvertBtn.classList.remove('active');
        modeConvertBtn.setAttribute('aria-pressed', 'false');
        inputLabel.textContent = 'Document Content';
        quizInput.placeholder = 'Upload or paste document content to generate a quiz from...';
        generateBtn.textContent = 'Generate Quiz';
    }
    // Store the correct text for the button for later use in toggleLoading
    originalGenerateBtnText = generateBtn.textContent;
    quizInput.value = '';
    uploadedContent = null; // Clear uploaded content on mode switch
    clearError();
    outputContainer.classList.add('hidden');
};

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // result is "data:mime/type;base64,the-base64-string", remove the prefix
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read blob as base64 string.'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Helper to read file as ArrayBuffer using Promises for cleaner async/await syntax
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read file as ArrayBuffer.'));
            }
        };
        reader.onerror = () => reject(reader.error || new Error('File reading error.'));
        reader.readAsArrayBuffer(file);
    });
};

const handleFile = async (file: File) => {
    clearError();
    toggleLoading(true, 'Processing file...');
    quizInput.value = ''; // Clear previous text input
    uploadedContent = null; // Clear previous file content

    try {
        if (file.type === 'application/pdf') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            
            const fileBuffer = await readFileAsArrayBuffer(file);
            const pdf = await pdfjsLib.getDocument(fileBuffer).promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map((item: any) => item.str).join(' ');
            }
            
            // Heuristic to check if it's a scanned PDF (very little text extracted)
            if (fullText.trim().length < 100 * pdf.numPages && pdf.numPages > 0) { 
                 // Likely a scanned PDF, switch to image conversion
                const images: { mimeType: string, data: string }[] = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    toggleLoading(true, `Converting page ${i} of ${pdf.numPages} to image...`);
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) throw new Error('Could not get canvas context.');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.8));
                    if (!blob) throw new Error(`Failed to convert page ${i} to image.`);

                    const base64Data = await blobToBase64(blob);
                    images.push({
                        mimeType: 'image/jpeg',
                        data: base64Data
                    });
                }
                uploadedContent = { type: 'images', data: images };
                quizInput.value = `[Processed ${pdf.numPages} pages from PDF for image recognition]`;
            } else {
                uploadedContent = { type: 'text', data: fullText };
                quizInput.value = fullText;
            }
        } else if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            uploadedContent = { type: 'text', data: result.value };
            quizInput.value = result.value;
        } else {
            throw new Error('Unsupported file type. Please upload a .pdf or .docx file.');
        }

    } catch (error: any) {
        console.error('Error processing file:', error);
        displayError(error.message || 'Failed to process file.');
        uploadedContent = null; // Clear content on error
    } finally {
        toggleLoading(false);
        fileInput.value = ''; // Reset file input
    }
};

const handleGenerate = async () => {
    const inputText = quizInput.value.trim();
    if (!inputText && !uploadedContent) {
        displayError(currentMode === 'convert' ? 'Please paste your quiz content into the text area.' : 'Please upload or paste document content.');
        return;
    }

    clearError();
    outputContainer.classList.add('hidden');
    toggleLoading(true);

    try {
        const systemPrompt = currentMode === 'convert' ? CONVERT_SYSTEM_PROMPT : GENERATE_SYSTEM_PROMPT;
        
        let contents: any;
        const contentToProcess = uploadedContent || { type: 'text', data: inputText };

        if (contentToProcess.type === 'images') {
            const textPart = { 
                text: currentMode === 'convert' 
                    ? `Hãy chuyển đổi nội dung từ các hình ảnh sau:`
                    : `Đây là nội dung tài liệu dưới dạng hình ảnh. Hãy tạo bài kiểm tra từ nó:`
            };
            const imageParts = contentToProcess.data.map(img => ({ inlineData: img }));
            contents = { parts: [textPart, ...imageParts] };
        } else { // 'text'
            contents = currentMode === 'convert' 
                ? `Hãy chuyển đổi nội dung sau:\n---\n${contentToProcess.data}` 
                : `Đây là nội dung tài liệu:\n---\n${contentToProcess.data}`;
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemPrompt,
            }
        });

        const generatedHtml = response.text;
        quizOutput.value = generatedHtml;
        outputContainer.classList.remove('hidden');

    } catch (error: any) {
        console.error('Error generating quiz:', error);
        let errorMessage = 'An error occurred while generating the quiz. Please try again.';
        if (error.message) {
            if (error.message.includes('API_KEY')) {
                errorMessage = 'Invalid API Key. Please ensure your API key is set up correctly.';
            } else if (error.message.toLowerCase().includes('quota')) {
                errorMessage = 'You have exceeded your API quota. Please check your account or try again later.';
            } else if (error.message.toLowerCase().includes('block')) {
                errorMessage = 'The request was blocked due to safety settings. Please adjust your input.';
            } else {
                errorMessage = `An error occurred: ${error.message}`;
            }
        }
        displayError(errorMessage);
    } finally {
        toggleLoading(false);
    }
};

const handleCopy = () => {
    if (!quizOutput.value) return;

    navigator.clipboard.writeText(quizOutput.value).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy Code';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        displayError('Failed to copy code to clipboard.');
    });
};

// --- EVENT LISTENERS ---
modeConvertBtn.addEventListener('click', () => switchMode('convert'));
modeGenerateBtn.addEventListener('click', () => switchMode('generate'));
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        handleFile(file);
    }
});
generateBtn.addEventListener('click', handleGenerate);
copyBtn.addEventListener('click', handleCopy);

// --- INITIALIZATION ---
switchMode('convert'); // Set initial state
