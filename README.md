# NFC Card Designer

A web-based, feature-rich design tool for creating custom, printable NFC-style cards. Built with React and Tailwind CSS, this application provides a live preview and extensive customization options, allowing users to export their creations as a print-ready PDF.

## Key Features

*   **Live Canvas Preview:** See your design changes in real-time on a dynamically updating canvas.
*   **Multiple Templates:** Choose from a variety of pre-built card templates, including "Game Card," "Steam Retro," "Magic," "Classic," and "Modern."
*   **Deep Customization:**
    *   **Text & Typography:** Adjust text content, font size, color, style, and alignment for various text elements.
    *   **Artwork & Style:** Upload custom header and main images, control image zoom and positioning, and apply unique procedural frame designs like "Galaxy" or "Lava Flow."
    *   **Color Control:** Fine-tune the color of every element on the card for a truly unique look.
*   **Multi-Card Projects:** Work on up to 8 cards in a single project, with easy duplication and deletion.
*   **Print-Ready PDF Export:** Export your entire card set as a single, high-resolution PDF, complete with optional cut lines and a safety inset to ensure perfect trimming.
*   **Responsive UI:** A clean, intuitive, and responsive interface that works great on desktop screens.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You'll need to have [Node.js](https://nodejs.org/) (which includes npm) installed on your computer.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/YOUR_USERNAME/nfc-card-designer.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd nfc-card-designer
    ```
3.  Install NPM packages:
    ```bash
    npm install
    ```

### Running the Application

Once the dependencies are installed, you can run the development server:

```bash
npm run dev
```

This will start the Vite development server, and you can view the application by navigating to `http://localhost:5173` (or the address shown in your terminal) in your web browser.

## Built With

*   React - The web framework used.
*   Vite - Frontend tooling and development server.
*   Tailwind CSS - For styling the user interface.
*   jsPDF - For generating the final PDF output.
*   Lucide React - For beautiful and consistent icons.