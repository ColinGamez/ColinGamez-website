# ColinGamez Website

A modern personal website built with **Astro 5** and **Tailwind CSS**, featuring project showcases, downloads, and social links.

## Features

- **Homepage**: Personal introduction with photo, bio, and social links
- **Projects Page**: Auto-fetched GitHub repositories with stars, descriptions, and links
- **Downloads Page**: Large file hosting with JSON-based manifest system
- **Dark/Light Mode**: Toggle with system preference detection
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **GitHub Pages Ready**: Automated deployment via GitHub Actions

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- GitHub account (for deployment)

### Local Development

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd colingamez-website
   npm install
   ```

2. **Configure Your Settings**
   Edit `/data/config.json`:
   ```json
   {
     "personalInfo": {
       "name": "Your Name",
       "bio": "Your bio here...",
       "photo": "/avatar.jpg"
     },
     "github": {
       "username": "yourgithubusername"
     },
     "socialLinks": [
       {
         "name": "YouTube",
         "url": "https://youtube.com/@yourchannel"
       }
     ]
   }
   ```

3. **Add Your Avatar**
   Replace `/public/avatar.jpg` with your actual photo

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:4321](http://localhost:4321)

## Configuration Guide

### Personal Information
Update your details in `/data/config.json`:
- **personalInfo**: Name, bio, and photo path
- **github.username**: Your GitHub username for repository fetching
- **socialLinks**: YouTube, GitHub, Twitter links

### Downloads Management
Add files to `/data/downloads.json`:
```json
{
  "downloads": [
    {
      "name": "Your File Pack",
      "size": "1073741824",
      "description": "Description of your file pack...",
      "downloadUrl": "https://your-storage.com/file.zip",
      "fileCount": 25
    }
  ]
}
```

**File Size Format**: Sizes should be in bytes (e.g., `1073741824` = 1GB)

### Cloud Storage Setup
For downloads, you'll need cloud storage. Recommended options:
- **Cloudflare R2**: Cost-effective with generous free tier
- **Backblaze B2**: Simple pricing and reliable
- **AWS S3**: Full-featured but more expensive

Update the `downloadUrl` fields in your downloads manifest with your storage URLs.

## Deployment

### GitHub Pages Setup

1. **Repository Settings**
   - Go to Settings > Pages
   - Source: "GitHub Actions"

2. **Update Configuration**
   In `astro.config.mjs`, update:
   ```js
   export default defineConfig({
     site: 'https://yourusername.github.io',
     base: '/your-repo-name',
   });
   ```

3. **Deploy**
   Push to the `main` branch to trigger automatic deployment

### Custom Domain (Optional)
1. Add your domain to `/public/CNAME`
2. Configure DNS with your domain provider
3. Update the `site` URL in `astro.config.mjs`

## Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.astro    # Navigation with theme toggle
│   │   ├── Footer.astro    # Footer with social links
│   │   ├── RepoCard.astro  # GitHub repository display
│   │   ├── FileCard.astro  # Download file display
│   │   └── ThemeToggle.astro # Dark/light mode switch
│   ├── layouts/
│   │   └── Layout.astro    # Base HTML layout
│   ├── pages/
│   │   ├── index.astro     # Homepage
│   │   ├── projects.astro  # GitHub projects page
│   │   └── downloads.astro # Downloads page
│   └── styles/
│       └── global.css      # Tailwind imports and custom styles
├── data/
│   ├── config.json         # Personal info and social links
│   └── downloads.json      # Downloads manifest
├── public/
│   ├── favicon.svg         # Site favicon
│   └── avatar.jpg          # Your profile photo
└── .github/workflows/
    └── deploy.yml          # GitHub Pages deployment
```

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run astro        # Run Astro CLI commands
```

## Adding New Downloads

1. Upload your files to cloud storage
2. Edit `/data/downloads.json`
3. Add a new entry with file details:
   ```json
   {
     "name": "File Name",
     "size": "52428800",
     "description": "What this file contains...",
     "downloadUrl": "https://storage-url/file.zip",
     "fileCount": 10
   }
   ```

## Customization

### Styling
- **Colors**: Edit the color palette in `tailwind.config.mjs`
- **Fonts**: Update font imports in `src/styles/global.css`
- **Components**: Modify individual component files in `src/components/`

### Analytics (Optional)
Add analytics by including tracking scripts in `src/layouts/Layout.astro`:
- Plausible Analytics
- Google Analytics
- Umami Analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this template for your own projects!

## Support

- Create an issue for bugs or feature requests
- Check out the [Astro documentation](https://docs.astro.build)
- Review [Tailwind CSS documentation](https://tailwindcss.com/docs)