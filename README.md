# SwiftBill Pro

Build a professional, modern, and lightweight multi-store retail POS and Billing Web App optimized for mobile and desktop screens. 



Here are the core requirements and features:



1. Multi-Firm / Multi-Store Management:

- Allow users to add and manage multiple business profiles/firms (e.g., Grocery Shop, Paint Shop, Electrical Shop, etc.).

- Users can select which firm profile to use at the top, and the respective firm name, address, and details should automatically appear on the bill header.



2. Invoice Header & Editable Controls (Crucial):

- Provide clear input fields at the top of the billing screen for Invoice Number, Date, and Time.

- These fields must be fully editable by the user at any time before printing or saving, allowing custom invoice numbers or back-dated/future-dated entries.



3. Product Management (Item Tab):

- An Item Management tab to add, edit, and delete products with their Name, Price, and Unit.

- Quick search functionality during billing to easily find and add items to the cart.

- Cart management with quantity adjustment (+/-) and total calculation.



4. Tax & Bill Settings:

- Default to a simple Cash Bill format (No GST required by default, but keep layout clean).

- Support for Cash or UPI payment method selection.



5. Flexible Printing Options (PDF & Thermal):

- Option 1: Standard A4/Letter size PDF preview and download.

- Option 2: 3-inch (80mm) Thermal Printer support. 

- Integrate Web Bluetooth API with a "Connect Thermal Printer" button so users can pair and print directly to a Bluetooth ESC/POS thermal printer.



6. Custom Footer & Signature Message:

- A settings or input section to type a custom thank-you message or footer note at the bottom of the bill (e.g., "Thank you, Visit again!").



7. Professional Design & UX:

- Clean, highly professional, clutter-free UI optimized for fast billing counters. 

- Auto-generated serial numbers for new invoices, which can still be manually overridden i

f needed as per requirement #2.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bill-pro-mate.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8af97bfc-87c3-4185-b8ec-c00d75e40f70).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
