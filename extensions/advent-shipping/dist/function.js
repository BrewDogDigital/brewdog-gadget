// node_modules/javy/dist/index.js
var r = /* @__PURE__ */ ((t) => (t[t.Stdin = 0] = "Stdin", t[t.Stdout = 1] = "Stdout", t[t.Stderr = 2] = "Stderr", t))(r || {});

// node_modules/javy/dist/fs/index.js
function o(i) {
  let r2 = new Uint8Array(1024), e = 0;
  for (; ; ) {
    const t = Javy.IO.readSync(i, r2.subarray(e));
    if (t < 0)
      throw Error("Error while reading from file descriptor");
    if (t === 0)
      return r2.subarray(0, e + t);
    if (e += t, e === r2.length) {
      const n = new Uint8Array(r2.length * 2);
      n.set(r2), r2 = n;
    }
  }
}
function l(i, r2) {
  for (; r2.length > 0; ) {
    const e = Javy.IO.writeSync(i, r2);
    if (e < 0)
      throw Error("Error while writing to file descriptor");
    if (e === 0)
      throw Error("Could not write all contents in buffer to file descriptor");
    r2 = r2.subarray(e);
  }
}

// node_modules/@shopify/shopify_function/run.ts
function run_default(userfunction) {
  const input_data = o(r.Stdin);
  const input_str = new TextDecoder("utf-8").decode(input_data);
  const input_obj = JSON.parse(input_str);
  const output_obj = userfunction(input_obj);
  const output_str = JSON.stringify(output_obj);
  const output_data = new TextEncoder().encode(output_str);
  l(r.Stdout, output_data);
}

// extensions/advent-shipping/src/run.ts
function run(input) {
  console.log("Advent Shipping Function started");
  const cart = input.cart;
  const deliveryGroups = cart.deliveryGroups;
  if (cart.lines.length < 2) {
    console.log("Cart has less than 2 items, no shipping discount");
    return { discounts: [] };
  }
  let hasAdventShippingProduct = false;
  let hasOtherProduct = false;
  for (const line of cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") {
      continue;
    }
    const product = line.merchandise.product;
    console.log(`Checking product: ${product.title}`);
    const hasAdventTag = product.hasTags?.some(
      (tagResponse) => tagResponse.hasTag && tagResponse.tag === "advent-shipping"
    ) || false;
    if (hasAdventTag) {
      hasAdventShippingProduct = true;
      console.log(`Found advent-shipping product: ${product.title}`);
    } else {
      hasOtherProduct = true;
      console.log(`Found other product: ${product.title}`);
    }
  }
  console.log(`Has advent shipping product: ${hasAdventShippingProduct}`);
  console.log(`Has other product: ${hasOtherProduct}`);
  if (!hasAdventShippingProduct || !hasOtherProduct) {
    console.log("Conditions not met for free shipping");
    return { discounts: [] };
  }
  console.log("Conditions met - applying free shipping");
  console.log("Applying 100% shipping discount");
  return {
    discounts: [{
      targets: [{
        orderSubtotal: {
          excludedVariantIds: []
        }
      }],
      value: {
        percentage: {
          value: 100
        }
      },
      message: "Free shipping with advent calendar"
    }]
  };
}

// <stdin>
function run2() {
  return run_default(run);
}
export {
  run2 as run
};
