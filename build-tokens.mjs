import fs from "fs";
import path from "path";
import _ from "lodash";
import Color from "color";

const tokens = JSON.parse(
  // eslint-disable-next-line no-undef
  fs.readFileSync(path.join(process.cwd(), "current_tokens.json"))
);

const mapping = {};

const priorityOrderForMapping = ["brand", "theme", "system"];
/* Earlier in array has higher priority and should override later ones */

const typeToKeyMapping = {
  color: "colors",
  fontSizes: "fontSize",
  boxShadow: "boxShadow",
  borderWidth: "borderWidth",
  opacity: "opacity",
  spacing: "spacing",
  borderRadius: "borderRadius",
};

const prefixMap = {
  light: "semantic/theme/",
  brand: "semantic/",
};

const getPrefix = (splitRefPath) => {
  const firstPart = splitRefPath[0];
  let pref = "";
  if (firstPart in prefixMap) {
    pref += prefixMap[firstPart];
  }
  if (splitRefPath[0] !== "core") {
    pref += splitRefPath.slice(0, 2).join("/") + ".";
  } else {
    pref += "core.";
  }
  return pref;
};

const DIV_SYMBOL = "/";
const MUL_SYMBOL = "*";
const ADD_SYMBOL = "+";
const SUB_SYMBOL = "-";
const MathSymbols = [DIV_SYMBOL, MUL_SYMBOL, ADD_SYMBOL, SUB_SYMBOL];

const resolveIfHasMath = (refVal, calculation) => {
  if (!refVal) return refVal;
  for (const symbol of MathSymbols) {
    if (calculation.includes(symbol)) {
      const param2 = _.toNumber(calculation.split(symbol)[1]);
      let cleanedRefVal = refVal;
      if (typeof cleanedRefVal === "string" && cleanedRefVal.includes("px")) {
        cleanedRefVal = _.toNumber(
          cleanedRefVal.slice(0, cleanedRefVal.indexOf("px"))
        );
      }
      switch (symbol) {
        case ADD_SYMBOL:
          return cleanedRefVal + param2;
        case SUB_SYMBOL:
          return cleanedRefVal - param2;
        case MUL_SYMBOL:
          return cleanedRefVal * param2;
        case DIV_SYMBOL:
          return cleanedRefVal / param2;
        default:
          break;
      }
    }
  }
  return refVal;
};

const getModifiedColor = (color, colorModification) => {
  const modifyBy = _.toNumber(colorModification.value);
  const colorObj = Color(color);
  const colorManipulated = colorObj[colorModification.type](modifyBy);
  const colorStr = colorManipulated.hex();
  // console.log(
  //   ` orig: ${color} ${colorModification.type}:${colorModification.value}, colorManipulated: ${colorStr}`
  // );
  return colorStr;
};

const getReferencedIfReference = (referenceOrValue) => {
  if (/\{.+\}/.test(referenceOrValue)) {
    const refStart = referenceOrValue.indexOf("{");
    const refStop = referenceOrValue.indexOf("}");
    const rest = referenceOrValue.slice(refStop + 1);
    const cleaned = referenceOrValue.slice(refStart + 1, refStop);

    let cleanedRefRes = _.get(tokens, cleaned);

    if (cleanedRefRes) {
      return resolveIfHasMath(cleanedRefRes, rest);
    }

    const splitRefPath = cleaned.split(".");

    const reconstructedRef = `${getPrefix(splitRefPath)}${cleaned}`;
    const reconstructedRefRes = _.get(tokens, reconstructedRef);

    if (typeof reconstructedRefRes === "object") {
      const finalResolvedRef = getReferencedIfReference(
        reconstructedRefRes.value
      );
      const colorModification =
        reconstructedRefRes["$extensions"]?.["studio.tokens"]?.modify;
      if (colorModification) {
        return getModifiedColor(finalResolvedRef, colorModification);
      }
      return resolveIfHasMath(finalResolvedRef, rest);
    }
    return resolveIfHasMath(
      getReferencedIfReference(reconstructedRefRes),
      rest
    );
  }
  return referenceOrValue;
};

let allPathsAndValues = [];
const unacceptableCharsMatcher = /[^(a-z)*(A-Z)*\-_*(0-9)*]/g;
const CSS_PROP_SEPARATOR = "-";
const CSS_PROP_INDICATOR = "--";

const constructCssPropName = (str) => {
  return `${CSS_PROP_INDICATOR}${str
    .split(".")
    .join(CSS_PROP_SEPARATOR)
    .replaceAll(unacceptableCharsMatcher, "")}`;
};

let cssProps = {};

const produceCSSAndJSONMappingFromTokens = (tokens, topLevelKey) => {
  const keys = Object.keys(tokens);
  const setFrom = topLevelKey.split("/").at(1);
  keys.forEach((key) => {
    const pathsAndValues = getAllPathsAndValues(tokens, key);
    allPathsAndValues = allPathsAndValues.concat(pathsAndValues);

    for (let i = 0; i < pathsAndValues.length; i += 2) {
      const type = pathsAndValues[i + 1].type;

      if (type in typeToKeyMapping) {
        const [path, depth] = pathsAndValues[i].split("~");

        const val = pathsAndValues[i + 1].value;
        let refRes = getReferencedIfReference(val);

        const colorModification =
          pathsAndValues[i + 1]["$extensions"]?.["studio.tokens"]?.modify;

        if (colorModification) {
          refRes = getModifiedColor(refRes, colorModification);
        }

        if (typeof refRes !== "string" && typeof refRes !== "number") {
          console.log("refRes not string", JSON.stringify(refRes));
          continue;
        }
        if (!refRes) {
          console.log({ val: pathsAndValues[i + 1].value, refRes });
        }

        if (typeof refRes === "number" || !Number.isNaN(+refRes)) {
          refRes = `${refRes}px`;
        }
        const splitPath = path.split(".");
        const twKey =
          // topLevelKey.replaceAll("/", "_") +
          // "_" +
          splitPath
            .slice(type === "color" ? depth - 1 : depth)
            .join("-")
            .replaceAll(unacceptableCharsMatcher, "");
        const mappingKey = `${typeToKeyMapping[type]}.${twKey}`;

        const cssPropName = constructCssPropName(mappingKey);

        const currVal = _.get(mapping, mappingKey);
        if (
          !currVal ||
          (currVal?.from &&
            priorityOrderForMapping.findIndex(
              (order) => currVal.from === order
            ) < priorityOrderForMapping.findIndex((order) => setFrom === order))
        ) {
          cssProps[cssPropName] = refRes;
          _.setWith(
            mapping,
            mappingKey,
            {
              from: setFrom,
              tailwind: {
                key: twKey,
                value: `var(${cssPropName})`,
              },
              css: `${cssPropName}`,
            },
            Object
          );
        }
      }
    }
  });
};

const getAllPathsAndValues = (tokenObject, path, depth = 0) => {
  const val = _.get(tokenObject, path);
  // if (!val) return;
  if (val.value) {
    return [`${path}~${depth}`, val];
  }

  return Object.keys(val).flatMap((key) =>
    getAllPathsAndValues(tokenObject, `${path}.${key}`, depth + 1)
  );
};

const shouldIncludeTokenSet = (key) => {
  if (
    key.startsWith("semantic/theme/light/") ||
    key.startsWith("semantic/brand/")
  ) {
    return true;
  }
  // Choose only certain values from system
  if (
    (key.startsWith("semantic/system/") &&
      !key.includes("font-size") &&
      !key.includes("spacing")) ||
    key === "semantic/system/font-size/L" ||
    key === "semantic/system/spacing/L"
  ) {
    return true;
  }
  return false;
};

const tokenKeys = Object.keys(tokens);
// console.log(`found tokenKeys of length ${tokenKeys.length}`);
tokenKeys.forEach((key) => {
  if (shouldIncludeTokenSet(key)) {
    console.log(`included key: ${key}`);
    produceCSSAndJSONMappingFromTokens(tokens[key], key);
    fs.writeFileSync(
      "./paths.json",
      JSON.stringify(allPathsAndValues, null, 2)
    );
  }
});

const convertCSSPropsToString = (cssProps) => {
  let cssPropStr = `:root{\n`;
  Object.keys(cssProps).forEach((key) => {
    cssPropStr += `\t${key}: ${cssProps[key]};\n`;
  });
  cssPropStr += `}`;
  return cssPropStr;
};

const createTWConfigFromMapping = (mapping) => {
  const twConfig = {};
  const keys = Object.keys(mapping);
  keys.forEach((twConfigKey) => {
    Object.keys(mapping[twConfigKey]).forEach((mappingVariantKey) => {
      const variantKey = mapping[twConfigKey][mappingVariantKey].tailwind.key;
      _.setWith(
        twConfig,
        `${twConfigKey}.${variantKey}`,
        mapping[twConfigKey][mappingVariantKey].tailwind.value,
        Object
      );
    });
  });

  fs.writeFileSync("./twConfig.json", JSON.stringify(twConfig, null, 2));
};

createTWConfigFromMapping(mapping);
fs.writeFileSync("./mapping.json", JSON.stringify(mapping, null, 2));
fs.writeFileSync("./cssProperties.css", `${convertCSSPropsToString(cssProps)}`);
