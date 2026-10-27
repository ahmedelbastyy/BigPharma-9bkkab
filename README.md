# BigPharma

BigPharma is a medication-access and medication-information app designed to make it easier for people to understand their medicines, keep track of them, and explore ways to find more affordable prescriptions.

The project focuses on a practical healthcare problem: prescription information and medication costs can be difficult to navigate. BigPharma brings medication-related tools into one app experience.

> **Important:** BigPharma is an informational tool, not a substitute for a pharmacist or other licensed healthcare professional. Always confirm medication decisions, interactions, and dosing with a qualified professional.

## What it is designed to do

- **Medication information:** Help users look up information about medicines, including information drawn from official drug-label sources where configured.
- **Medication tracking:** Provide a place for users to keep track of their medications.
- **Prescription affordability:** Help users explore discounted medication prices and nearby pharmacy options, where the relevant data services are available.
- **Drug-label lookup:** The project has explored the openFDA drug-label API, which can search official label text and sections. API results should be interpreted carefully and are not personalized medical advice.

Availability of individual features may depend on the current app build, network access, and any required third-party service configuration. The repository is the source of truth for what is implemented in this version.

## Technology

The repository's existing project documentation identifies this as a cross-platform app built with:

- React Native
- Expo
- Expo Router
- TypeScript
- Supabase

It also uses supporting React Native / Expo libraries. See `package.json` for the installed dependency versions and scripts.

## Run locally

### Requirements

- Node.js and npm
- Git
- A compatible development environment:
  - **Expo Go** on a phone for a quick preview, where supported by the app's dependencies
  - **Android Studio** for an Android emulator
  - **Xcode** on macOS for the iOS simulator

### 1. Clone the repository

```bash
git clone https://github.com/ahmedelbastyy/BigPharma-9bkkab.git
cd BigPharma-9bkkab
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure services, if needed

Some features may depend on external services or credentials. Before running the app, inspect the project for its environment/configuration requirements and set up any services the code actually uses, such as Supabase or external medication-data APIs.

- Never commit API keys, passwords, access tokens, or production credentials.
- Do not put private server-side secrets in a client-side mobile app.
- If you add environment variables locally, use the variable names expected by the code and keep the local secrets file out of Git.

This repository may not run every connected feature until its required services are configured.

### 4. Start Expo

```bash
npx expo start
```

Use the terminal instructions or QR code shown by Expo to open the app on a supported device. To launch a platform directly, the project may also provide these npm scripts:

```bash
npm run android
npm run ios
npm run web
```

The iOS simulator requires macOS and Xcode. If a script is unavailable in the current checkout, use the scripts listed in `package.json`.

### 5. Check the project

If the relevant scripts are present in `package.json`, you can run:

```bash
npm run lint
```

If startup fails, check the installed Node.js version, dependency installation, Expo's terminal output, and any missing service configuration.

## Medication data and responsible use

BigPharma is intended to improve access to medication information and affordability resources. Drug labels and third-party pricing or pharmacy data can be incomplete, delayed, or unavailable. A search result is not a diagnosis, a prescription, or a guarantee that a medication is appropriate for a particular person.

- Confirm medication questions with a pharmacist or prescriber.
- Confirm current price, availability, eligibility, and pharmacy details with the pharmacy or service providing them.
- Do not use the app to make urgent medical decisions.
- Do not enter real patient information into a development build unless the app's privacy and security protections have been reviewed.

## Congressional App Challenge

BigPharma is being prepared for consideration in the Congressional App Challenge. This section is intended to help reviewers understand the project's purpose, technology, and setup.

### AI-use disclosure

AI tools were used as development aids during work on this project. The student developer remains responsible for the project, its implementation, testing, and explanation. For the competition submission, the developer should identify the specific AI tools used and accurately describe the tasks they assisted with; AI assistance must not be presented as the entirety of the technical work.

### Demo

Add the public link to the final demonstration video here before submitting:

- **Demo video:** _https://youtu.be/mNihQRdVa9I?si=PqOv4PHf1L6XyuIM_

### Reviewer setup notes

Reviewers should follow the local setup instructions above. If a feature requires credentials or a connected service, document the required configuration without publishing any secret keys.

## Project status

This README describes the project's purpose and general setup. Feature availability, API integrations, and required configuration can change as development continues. Verify the current code and test the app from a clean checkout before relying on any feature or presenting it as complete.

## License

Check the repository's root-level license file before reusing or redistributing this code. If no license is present, do not assume the code is open source or that reuse is permitted. Confirm that the repository's license and ownership terms meet the Congressional App Challenge's current requirements before submission.
