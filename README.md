# Demo theme switching

This repo demonstrates the ability to generate tailwind config and css properties from figma design tokens and use them in an app to switch between different brands' themes on the fly.

## Steps to run and test locally

The app.jsx file depends on two css files cssProperties-brand1.css and cssProperties-brand2.css. Only one will be loaded at any given time.

To test the functionality from scratch, do the following:

* \[Optional] Replace the current_tokens.json file with your own figma tokens file of the same structure. Ensure that your file is named current_tokens.json.
* Run `npm run build-styles`. This will output a cssProperties.css file, mapping.json file and a twConfig.json file.
* The mapping.json file is for inspecting if the keys are generated right. If you're not interested in that, you can safely ignore it.
* Rename the cssProperties.css file to `cssProperties-brand1.css`. Edit if necessary.
* Use another figma tokens file and generate a new cssProperties file. The twConfig.json file will be identical to the previous one as long as no changes are made to the structure including the names of the keys.
* Rename the newly generated cssProperties file to `cssProperties-brand2.css`. You may edit this file if necessary.
* Now run the project by running the command `npm run dev` and visit <http://localhost:4002>. You should have an app that allows you to switch themes with the click of a button.
