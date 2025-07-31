# i18n Language Coverage Badge

A web service that generates language-specific translation coverage badges for GitHub repositories with i18n files.

## Features

- 🌍 **Multi-language Support**: Supports various i18n file structures and plural forms
- 🎨 **Customizable Badges**: Color-coded badges with multiple style options
- ⚡ **Fast & Cached**: Efficient caching with GitHub ETag support
- 🔍 **Auto-Detection**: Automatically detects i18n file structures

## Usage

Language-specific coverage:
```markdown
![ko](https://your-domain.vercel.app/apache/airflow/ko?path=airflow-core/src/airflow/ui/public/i18n/locales)
```
![ar](https://airflow-translation-tracker.vercel.app/apache/airflow/ar?path=airflow-core/src/airflow/ui/public/i18n/locales)
![de](https://airflow-translation-tracker.vercel.app/apache/airflow/de?path=airflow-core/src/airflow/ui/public/i18n/locales)
![es](https://airflow-translation-tracker.vercel.app/apache/airflow/es?path=airflow-core/src/airflow/ui/public/i18n/locales)
![fr](https://airflow-translation-tracker.vercel.app/apache/airflow/fr?path=airflow-core/src/airflow/ui/public/i18n/locales)
![he](https://airflow-translation-tracker.vercel.app/apache/airflow/he?path=airflow-core/src/airflow/ui/public/i18n/locales)
![ko](https://airflow-translation-tracker.vercel.app/apache/airflow/ko?path=airflow-core/src/airflow/ui/public/i18n/locales)
![nl](https://airflow-translation-tracker.vercel.app/apache/airflow/nl?path=airflow-core/src/airflow/ui/public/i18n/locales)
![pl](https://airflow-translation-tracker.vercel.app/apache/airflow/pl?path=airflow-core/src/airflow/ui/public/i18n/locales)
![zh-TW](https://airflow-translation-tracker.vercel.app/apache/airflow/zh-TW?path=airflow-core/src/airflow/ui/public/i18n/locales)


## API

Language-specific coverage badge:
```
GET /{owner}/{repo}/{language}?path={locales_path}
```

**Parameters:**
- `path` (required): Path to i18n/locales directory
- `style`: Badge style (`flat`, `flat-square`, `plastic`, `for-the-badge`)
- `logo`: Logo name (`translate`, `github`)
- `label`: Custom label text

**Example:**
```
GET /apache/airflow/ko?path=airflow-core/src/airflow/ui/public/i18n/locales
```

## Supported File Structures

The service automatically detects various i18n file formats:

### Directory-based Structure
```
/locales/
  ├── en/
  │   ├── common.json
  │   └── ui.json
  ├── ko/
  │   ├── common.json
  │   └── ui.json
  └── fr/
      ├── common.json
      └── ui.json
```

### File-based Structure  
```
/locales/
  ├── en.json
  ├── ko.json
  └── fr.json
```

### Supported Paths
- `/locales/{lang}/{namespace}.json`
- `/locales/{lang}.json`
- `/i18n/{lang}/{namespace}.json`
- `/src/locales/{lang}/{namespace}.json`
- `/public/locales/{lang}/{namespace}.json`

## Coverage Calculation

### Base Language Detection
Uses English locale as base for comparison:
- `en`, `en-US`, `en_US` (in order of preference)
- Falls back to first available language if no English found

### Plural Form Support  
Handles complex plural forms for different languages:
- **Korean**: `_other` only
- **Polish**: `_one`, `_few`, `_many`, `_other`
- **Arabic**: `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`
- **And many more...**

### Coverage Colors
- 🟢 **Green** (#4c1): 95-100% coverage
- 🟡 **Yellow** (#dfb317): 80-94% coverage  
- 🟠 **Orange** (#fe7d37): 60-79% coverage
- 🔴 **Red** (#e05d44): <60% coverage

## Deployment

### Deploy to Vercel

1. **Clone and Setup**
   ```bash
   git clone <your-repo>
   cd i18n-coverage-badge
   npm install
   ```

2. **Environment Variables**
   ```bash
   # Optional: GitHub token for higher rate limits
   GITHUB_TOKEN=your_github_token_here
   
   # Optional: Custom cache TTL
   CACHE_TTL=60
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```


## Development

### Setup
```bash
git clone <repo-url>
cd i18n-coverage-badge
npm install
cp .env.example .env  # Add your GitHub token
```

### Run Locally
```bash
npm run dev
```

### Run Tests
```bash
npm test
npm run test:watch
```

### Lint
```bash
npm run lint
npm run lint:fix
```

## Configuration

### Environment Variables
- `GITHUB_TOKEN`: GitHub personal access token (recommended)
- `CACHE_TTL`: Cache duration in seconds (default: 60)
- `NODE_ENV`: Environment (`development` or `production`)

### Caching Strategy
- **File Content Cache**: 5 minutes with GitHub ETag support
- **Coverage Results**: 1 minute for fast response
- **Rate Limiting**: Respects GitHub API limits

## Error Handling

The service handles various error scenarios gracefully:

| Error | Badge Message | HTTP Status |
|-------|---------------|-------------|
| Repository not found | "repository not found" | 404 |
| Language not found | "language not found" | 404 |
| No i18n files | "no translations found" | 404 |
| Invalid path | "invalid path" | 400 |
| Rate limited | "rate limited" | 429 |
