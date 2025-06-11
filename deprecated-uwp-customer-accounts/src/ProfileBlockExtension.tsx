import { reactExtension, Link, Card, InlineStack, Text } from '@shopify/ui-extensions-react/customer-account';

export default reactExtension(
  'customer-account.profile.block.render',
    () => <BlockExtension />
);

function BlockExtension() {
  return (
    <Card padding>
      <InlineStack inlineAlignment="center" spacing="tight">
        <Text>Equity for Punks.</Text>
        <Link to="extension:/">View your status</Link>
      </InlineStack>
    </Card>
  );
}