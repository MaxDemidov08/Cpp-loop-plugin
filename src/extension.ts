import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const provider = vscode.languages.registerCompletionItemProvider(
        'cpp', 
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const completionItems: vscode.CompletionItem[] = [];

                // Флаги, считанные имена и типы данных
                let detectedContainer = 'items'; 
                let detectedType = 'auto'; 
                let isVector = false;

                // Сканируем до 50 предыдущих строк
                const startLine = Math.max(0, position.line - 50);
                for (let i = position.line - 1; i >= startLine; i--) {
                    const lineText = document.lineAt(i).text;

                    // Поиск вектора
                    const vectorRegex = /(?:std::)?vector<\s*([\w::<>]+)\s*>\s+(\w+)/;
                    const vectorMatch = lineText.match(vectorRegex);
                    
                    if (vectorMatch) {
                        detectedType = vectorMatch[1];      // Тип
                        detectedContainer = vectorMatch[2]; // Имя 
                        isVector = true;
                        break; 
                    }

                    // Поиск обычного массива
                    const arrayRegex = /(\w+)\s+(\w+)\s*\[\s*\d*\s*\]/;
                    const arrayMatch = lineText.match(arrayRegex);
                    if (arrayMatch) {
                        detectedType = arrayMatch[1];
                        detectedContainer = arrayMatch[2];
                        isVector = false;
                        break;
                    }
                }

                // 1. Умный Range-based for
                const rangeFor = new vscode.CompletionItem('foreach', vscode.CompletionItemKind.Snippet);
                rangeFor.detail = `💡 Итерируемся по ${detectedContainer} (тип: ${detectedType})`;
                rangeFor.documentation = new vscode.MarkdownString(`Создает цикл для перебора элементов типа \`\${detectedType}\`.`);
                rangeFor.insertText = new vscode.SnippetString(
                    `for (const ${detectedType} \${1:item} : ${detectedContainer}) {\n\t\$0\n}`
                );
                completionItems.push(rangeFor);

                // 2. Классический индексный цикл for
                const classicFor = new vscode.CompletionItem('forindex', vscode.CompletionItemKind.Snippet);
                classicFor.detail = `💡 Индексный цикл для ${detectedContainer}`;
                
                const sizeCondition = isVector ? `${detectedContainer}.size()` : `\${2:size}`;
                classicFor.insertText = new vscode.SnippetString(
                    `for (size_t \${1:i} = 0; \${1:i} < ${sizeCondition}; ++\${1:i}) {\n\t\$0\n}`
                );
                completionItems.push(classicFor);

                return completionItems;
            }
        }
    );

    context.subscriptions.push(provider);
}

export function deactivate() {}
