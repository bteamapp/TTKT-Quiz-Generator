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


// --- AI SETUP ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CONVERT_SYSTEM_PROMPT = `Bạn là một trợ lý soạn thảo mã HTML chuyên nghiệp cho bài kiểm tra "Trắc nghiệm TTKT". Hãy chuyển đổi nội dung tôi cung cấp dưới đây thành mã HTML, tuân thủ cực kỳ nghiêm ngặt các quy tắc sau:
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
11. Giữ nguyên chính xác 100% nội dung câu hỏi. Chỉ xuất ra mã HTML, không chèn thêm CSS hay JavaScript.`;

const GENERATE_SYSTEM_PROMPT = `Bạn là một AI chuyên tạo bài kiểm tra. Dựa vào nội dung tài liệu được cung cấp, hãy tạo một bài kiểm tra trắc nghiệm gồm 10 câu hỏi để đánh giá sự hiểu biết về nội dung đó.
QUAN TRỌNG: Sau khi tạo xong các câu hỏi, hãy định dạng toàn bộ bài kiểm tra thành mã HTML theo các quy tắc nghiêm ngặt sau đây:\n` + CONVERT_SYSTEM_PROMPT;


// --- FUNCTIONS ---
const toggleLoading = (isLoading: boolean, message: string = "Generating your quiz, please wait...") => {
    loadingIndicator.querySelector('p')!.textContent = message;
    loadingIndicator.classList.toggle('hidden', !isLoading);
    generateBtn.disabled = isLoading;
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
    } else {
        modeGenerateBtn.classList.add('active');
        modeGenerateBtn.setAttribute('aria-pressed', 'true');
        modeConvertBtn.classList.remove('active');
        modeConvertBtn.setAttribute('aria-pressed', 'false');
        inputLabel.textContent = 'Document Content';
        quizInput.placeholder = 'Upload or paste document content to generate a quiz from...';
    }
    quizInput.value = '';
    clearError();
    outputContainer.classList.add('hidden');
};

const handleFile = async (file: File) => {
    clearError();
    const originalBtnText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = 'Processing...';
    uploadBtn.disabled = true;

    try {
        let text = '';
        if (file.type === 'application/pdf') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            const reader = new FileReader();
            await new Promise<void>((resolve) => {
                reader.onload = async () => {
                    const pdf = await pdfjsLib.getDocument(reader.result).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map((item: any) => item.str).join(' ');
                    }
                    text = fullText;
                    resolve();
                };
                reader.readAsArrayBuffer(file);
            });
        } else if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            text = result.value;
        } else {
            throw new Error('Unsupported file type. Please upload a .pdf or .docx file.');
        }
        quizInput.value = text;

    } catch (error: any) {
        console.error('Error processing file:', error);
        displayError(error.message || 'Failed to process file.');
    } finally {
        uploadBtn.innerHTML = originalBtnText;
        uploadBtn.disabled = false;
        fileInput.value = ''; // Reset file input
    }
};

const handleGenerate = async () => {
    const inputText = quizInput.value.trim();
    if (!inputText) {
        displayError(currentMode === 'convert' ? 'Please paste your quiz content into the text area.' : 'Please upload or paste document content.');
        return;
    }

    clearError();
    outputContainer.classList.add('hidden');
    toggleLoading(true);

    try {
        const systemPrompt = currentMode === 'convert' ? CONVERT_SYSTEM_PROMPT : GENERATE_SYSTEM_PROMPT;
        const userMessage = currentMode === 'convert' 
            ? `Hãy chuyển đổi nội dung sau:\n---\n${inputText}` 
            : `Đây là nội dung tài liệu:\n---\n${inputText}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction: systemPrompt,
            }
        });

        const generatedHtml = response.text;
        quizOutput.value = generatedHtml;
        outputContainer.classList.remove('hidden');

    } catch (error) {
        console.error('Error generating quiz:', error);
        displayError('An error occurred while generating the quiz. Please check the console for details and try again.');
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
