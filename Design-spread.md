---
tags:
  - ia/skills
  - design
  - identidade-visual
  - spread
  - frontend
aliases:
  - Skill Design Spread
  - Identidade Visual Spread
created: 2026-05-19
---

# Skill: Design Spread

> **Skill Name:** `design-spread`
> **Descrição:** Diretrizes de identidade visual e tabela de cores institucionais da empresa [[Spread]]. Use esta skill ao criar designs ou aplicações web para a Spread.

---

## Identidade Visual e Cores Institucionais – [[Spread]]

Ao desenvolver aplicações web, interfaces ou qualquer material visual para a **[[Spread]]**, você DEVE utilizar exclusivamente a **paleta de cores institucional** definida abaixo. As cores institucionais foram definidas para veicular a identidade da empresa e devem predominar (**Amarelo, Laranja e Roxo**) tanto em materiais corporativos quanto promocionais.

---

## 🎨 Tabela de Cores (Paleta Oficial)

Para uso em **mídia eletrônica** (web/apps), utilize sempre as referências **Hexadecimal** ou **RGB**. As referências CMYK são válidas para impressão offset.

| Cor | Hexadecimal | RGB | CMYK | Significado e Uso |
| :--- | :--- | :--- | :--- | :--- |
| **Amarelo / Laranja Claro** | `#FF9A0A` | `R: 255, G: 154, B: 10` | C:0% M:52% Y:92% K:0% | Cor vibrante para detalhes e composição junto ao Laranja principal. |
| **Laranja Spread** | `#FF7400` | `R: 255, G: 116, B: 0` | C:0% M:72% Y:93% K:0% | **Cor Principal.** Combina energia do vermelho e felicidade do amarelo. Representa entusiasmo, fascínio, alegria, criatividade, determinação, sucesso e estímulo. |
| **Roxo Spread** | `#4B1196` | `R: 75, G: 17, B: 150` | C:88% M:98% Y:0% K:0% | Cor vívida e high-tech inspirada em neons/gadgets. Representa cargas positivas, sucesso, sabedoria, personalidade forte e resolução de problemas. |
| **Cinza Escuro / Preto** | `#2D2D2D` | `R: 45, G: 45, B: 45` | C:82% M:79% Y:70% K:47% | Utilize para textos principais, títulos e fundos escuros de alto contraste. |
| **Cinza Claro** | `#7F7F7F` | `R: 127, G: 127, B: 127` | C:59% M:48% Y:48% K:0% | Utilize para textos secundários, bordas, divisórias e elementos de interface neutros. |
| **Branco** | `#FFFFFF` | `R: 255, G: 255, B: 255` | C:5% M:3% Y:3% K:0% | Utilize para espaços em branco garantindo visual limpo e fundos padrão para maximizar o contraste com cores vivas. |

---

## 📐 Diretrizes e Combinações de Aplicação

- **[[Tipografia Oficial]] (Pág. 10 do Manual):**
  - **Títulos e Cabeçalhos:** Deve-se utilizar obrigatoriamente a família tipográfica **`Montserrat`**.
  - **Textos Corridos e Leitura:** Deve-se utilizar a família tipográfica **`Ubuntu`**.
  - **Padrão Alternativo (Sistemas/Relatórios):** Em documentos operacionais ou no caso de impossibilidade técnica, recomenda-se o uso da família **`Calibri`**.

- **[[Cores de Apoio]]:** Nossas cores de apoio são definidas por escala de combinação. Você pode utilizar todas as cores localizadas na escala da cor principal (Laranja), garantindo que as cores selecionadas se contrastem adequadamente.

- **[[Proibição de Degradês e Neons]] (Design Clean e Sólido):**
  - **Sem Degradês:** Evite o uso de gradientes de cores misturadas (como laranja para roxo) em elementos da interface. Utilize **cores sólidas** e puras da marca para barras de progresso, botões, badges e fundos.
  - **Sem Neons/Glows:** Não aplique sombras com efeitos brilhantes, auras neon ou filtros de `drop-shadow` fluorescentes nas bordas de cards ou anéis de progresso. As sombras devem ser sempre sóbrias, escuras e corporativas (`var(--shadow-sm)`).
  - **Visual Flat:** Dê preferência a fundos de cores sólidas e opacidades limpas (ex: `rgba(45, 45, 45, 0.4)` para fundos ou `rgba(255, 116, 0, 0.08)` para destaques sutis).

---

## 💻 Exemplo de Variáveis CSS (Tema Escuro Sóbrio)

**Exemplo real de Variáveis CSS integradas no Command Center:**

```css
:root {
  /* Cores Spread */
  --color-spread-yellow:  #FF9A0A;
  --color-spread-orange:  #FF7400;
  --color-spread-purple:  #4B1196;
  --color-spread-dark:    #2D2D2D;
  --color-spread-gray:    #7F7F7F;
  --color-spread-white:   #FFFFFF;

  /* Fontes Oficiais do Manual */
  --font-primary: "Ubuntu", -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
  --font-heading: "Montserrat", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;

  /* Acento de Cor Sólida (Sem Degradê) */
  --gradient-spread: var(--color-spread-orange);
  --gradient-spread-soft: rgba(255, 116, 0, 0.08);

  /* Sombras Corporativas Flat (Sem Neons) */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-glow: var(--shadow-sm);
  --shadow-glow-purple: var(--shadow-sm);
}
```

---

## 🔗 Conexões Relacionadas

- [[Spread]]
- [[Identidade Visual]]
- [[Design System]]
- [[Palmeiras Institutional UI]]
- [[CSS]]
- [[Tailwind]]
- [[Frontend]]
- [[UI/UX]]