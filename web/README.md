# NovelAI Image Generator

A modern web application for generating images using NovelAI's diffusion models, built with Next.js 15 and featuring local storage capabilities.

## Features

- 🎨 **Image Generation**: Generate high-quality images using NovelAI's nai-diffusion-4-5-full model
- 💾 **Local Storage**: Images and generation parameters are stored locally using IndexedDB
- 🔍 **History Management**: View, search, and manage your generated images
- ⚙️ **Advanced Settings**: Fine-tune generation parameters like CFG scale, steps, and more
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🌙 **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: shadcn/ui + Tailwind CSS
- **Database**: IndexedDB (client-side storage)
- **Language**: TypeScript
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- NovelAI API key

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:
   Edit `.env.local` and add your NovelAI API key:

   ```
   NOVELAI_API_KEY=your_api_key_here
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Getting a NovelAI API Key

1. Visit [NovelAI](https://novelai.net/)
2. Create an account and subscribe to a plan
3. Go to your account settings to find your API key

## Usage

1. **Generate Images**:

   - Enter a prompt describing the image you want
   - Optionally adjust the negative prompt and parameters
   - Click "Generate Image"

2. **View History**:

   - Click "Show History" to view all previously generated images
   - Search through your images by prompt
   - Download or delete individual images

3. **Advanced Settings**:
   - Click "Show Advanced" to access additional parameters
   - Adjust number of samples, and other generation settings

## Default Parameters

The application uses these optimized default settings:

- **Model**: nai-diffusion-4-5-full
- **Resolution**: 832×1216 (portrait)
- **Sampler**: k_euler_ancestral
- **Scheduler**: karras
- **CFG Scale**: 5
- **Steps**: 28
- **Decrisper**: true

## Local Storage

All generated images and their metadata are stored locally in your browser using IndexedDB. This means:

- ✅ Your images are private and never leave your device
- ✅ No server storage costs
- ✅ Works offline for viewing history
- ⚠️ Images are tied to your browser/device
- ⚠️ Clearing browser data will delete your images

## License

This project is licensed under the MIT License.

## Disclaimer

This application is not affiliated with NovelAI. You need a valid NovelAI subscription and API key to use the image generation features.
