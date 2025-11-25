# Keep-PH

Keep-PH is a digital mail management platform that digitizes your physical mail. We receive your mail, scan it, and deliver it to your secure online mailbox for easy access from any device.

## Features

- **Secure Mail Scanning:** Receive and digitize physical mail
- **Online Mailbox:** Access your mail digitally from anywhere
- **Mail Forwarding:** Forward physical mail as needed
- **Check Deposits:** Deposit checks on your behalf
- **Dedicated Address:** Get a mailing address for mail processing

## Tech Stack

- **Frontend:** Next.js, React, Mantine UI
- **Backend:** Supabase
- **Styling:** Tailwind CSS
- **Testing:** Playwright
- **State Management:** Zustand
- **Forms:** React Hook Form

## Getting Started

1. Clone the repository:

```bash
git clone <repository-url>
cd keep-ph
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local` and configure your Supabase and other API keys.

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing

Run the test suite with Playwright:

```bash
npm run test
```

View test results in UI mode:

```bash
npm run test:ui
```

Generate test report:

```bash
npm run test:report
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Playwright tests
- `npm run validate-setup` - Validate project setup

## Deployment

Deploy on Vercel or your preferred platform.

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
