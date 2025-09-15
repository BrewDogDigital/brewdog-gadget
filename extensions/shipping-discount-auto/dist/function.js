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

// extensions/shipping-discount-auto/src/run.ts
var EMPTY_DISCOUNT = {
  discountApplicationStrategy: "ALL" /* All */,
  discounts: []
};
function run(input) {
  console.log("Shipping Discount Auto Function started");
  let discountAmount = 0;
  const targets = [];
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") {
      continue;
    }
    const product = line.merchandise.product;
    console.log(`Checking product: ${product.title}`);
    console.log(`Product hasTags:`, product.hasTags);
    const shippingDiscountTags = product.hasTags?.filter((tagResponse) => tagResponse.hasTag && tagResponse.tag.startsWith("shipping-discount-")).map((tagResponse) => tagResponse.tag) || [];
    if (shippingDiscountTags.length > 0) {
      console.log(`Found shipping discount tags on ${product.title}:`, shippingDiscountTags);
      const amounts = shippingDiscountTags.map((tag) => {
        const amountStr = tag.replace("shipping-discount-", "");
        const amount = parseFloat(amountStr);
        console.log(`Parsed tag "${tag}" to amount: ${amount}`);
        return amount;
      }).filter((amount) => !isNaN(amount) && amount > 0);
      if (amounts.length > 0) {
        const tagDiscountAmount = Math.max(...amounts);
        console.log(`Product discount amount: ${tagDiscountAmount}`);
        discountAmount = Math.max(discountAmount, tagDiscountAmount);
        targets.push({
          cartLine: {
            id: line.id,
            quantity: line.quantity
          }
        });
        console.log(`Added line to targets: ${product.title} (${line.id})`);
      }
    }
  }
  console.log(`Final discount amount: ${discountAmount}`);
  console.log(`Total targets: ${targets.length}`);
  if (targets.length === 0 || discountAmount === 0) {
    console.log("No valid discount found, returning empty discount");
    return EMPTY_DISCOUNT;
  }
  console.log(`Applying $${discountAmount} fixed discount to ${targets.length} items with shipping discount tags`);
  return {
    discounts: [
      {
        targets,
        value: {
          fixedAmount: {
            amount: discountAmount.toFixed(2),
            appliesToEachItem: false
          }
        }
      }
    ],
    discountApplicationStrategy: "ALL" /* All */
  };
}

// <stdin>
function run2() {
  return run_default(run);
}
export {
  run2 as run
};
