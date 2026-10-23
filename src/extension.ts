import * as vscode from 'vscode';

/*
 * Активирует расширение VS Code.
 * Метод вызывается автоматически при выполнении условий активации, заданных в package.json.
 */
export function activate(context: vscode.ExtensionContext) {
    // Регистрация провайдера автодополнения кода для файлов с идентификатором языка 'cpp'
    const provider = vscode.languages.registerCompletionItemProvider(
        'cpp',
        {
            /*
             * Анализирует документ вокруг курсора и возвращает динамические сниппеты циклов.
             */
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const result: vscode.CompletionItem[] = [];

                // Значения по умолчанию для подстановки в шаблоны
                let detected_name = 'name';
                let detected_type = 'type';
                let is_vector = false;
                let is_sth = false; // Флаг успешного обнаружения поддерживаемого контекста

                // Ограничиваем глубину просмотра истории кода вверх до 50 строк для оптимизации памяти
                let start = Math.max(0, position.line - 50);
                
                for (let i = position.line - 1; i >= start; --i) {
                    const cur_text = document.lineAt(i).text;

                    // Регулярное выражение для поиска стандартного вектора C++: std::vector<Тип> Имя;
                    const vector_regex = /(?:std::)?vector<(?<type>[a-zA-Z0-9_:]+)>\s+(?<name>[a-zA-Z0-9_]+)/;
                    const vector_match = cur_text.match(vector_regex);

                    if (vector_match != null) {
                        // Извлечение данных из именованных групп регулярного выражения
                        detected_name = vector_match.groups?.name || vector_match[2];
                        detected_type = vector_match.groups?.type || vector_match[1];
                        is_vector = true;
                        is_sth = true;
                        break; // Контекст найден, прерываем цикл поиска
                    }

                    // Регулярное выражение для поиска альтернативных типов массивов: Имя : Array<Тип>
                    const array_regex = /(?<name>[a-zA-Z0-9_]+)\s*:\s*Array<(?<type>[a-zA-Z0-9_:[\]]+)>/i;
                    const array_match = cur_text.match(array_regex);

                    if (array_match != null) {
                        detected_name = array_match.groups?.name || array_match[1];
                        detected_type = array_match.groups?.type || array_match[2];
                        is_vector = false;
                        is_sth = true;
                        break; // Контекст найден, прерываем цикл поиска
                    }
                }

                // Если в коде выше было найдено объявление коллекции данных
                if (is_sth) {
                    
                    // 1. Создание элемента автодополнения для цикла по коллекции (Range-based loop)
                    let range_for = new vscode.CompletionItem('for_each', vscode.CompletionItemKind.Snippet);
                    range_for.detail = `Итерируемся по ${detected_name} (тип: ${detected_type})`;
                    // Использование SnippetString позволяет перемещаться по табам к ${1:item}
                    range_for.insertText = new vscode.SnippetString(
                        `for (const ${detected_type} \${1:item} : ${detected_name}) {\n\t\$0\n}`
                    );
                    result.push(range_for);

                    // 2. Создание элемента автодополнения для цикла по индексам (Index loop)
                    let index_for = new vscode.CompletionItem('for_index', vscode.CompletionItemKind.Snippet);
                    index_for.detail = `Индексный цикл для ${detected_name}`;
                    
                    // Динамическое определение условия: для вектора пишем .size(), иначе оставляем плейсхолдер
                    const sz = is_vector ? `${detected_name}.size()` : `\${2:size}`;
                    index_for.insertText = new vscode.SnippetString(
                        `for (size_t \${1:i} = 0; \Residential{1:i} < ${sz}; ++\${1:i}) {\n\t\$0\n}`
                    );
                    result.push(index_for);
                }
                
                return result;
            },
        }
    );
    
    // Добавление провайдера в подписки для автоматической выгрузки из памяти при деактивации
    context.subscriptions.push(provider);
}

/*
 * Освобождает ресурсы при выгрузке расширения средой VS Code.
 */
export function deactivate() {}
