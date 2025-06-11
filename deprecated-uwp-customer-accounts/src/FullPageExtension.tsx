import { Banner, Page, reactExtension, useApi, Text, useAuthenticatedAccountCustomer } from '@shopify/ui-extensions-react/customer-account';
import { useEffect, useState } from 'react';
import { Client } from "@gadget-client/brewdog";
import { Provider } from "@gadgetinc/shopify-extensions/react";
import { set, useFindOne } from '@gadgetinc/react';

const api = new Client();

export default reactExtension(
  "customer-account.page.render",
  () => <GadgetExtension />
);

function GadgetExtension() {
  const { sessionToken } = useApi();

  return (
    <Provider api={api} sessionToken={sessionToken}>
      <FullPageExtension />
    </Provider>
  );
}

function FullPageExtension() {
  const { extension, i18n } = useApi();
  const customer = useAuthenticatedAccountCustomer();
  const [memberStatus, setMemberStatus] = useState(false);
  const [memberDiscount, setMemberDiscount] = useState(0);
  const [name, setName] = useState('');

  const [{ data: customerRecord, fetching, error }] = useFindOne(
    api.shopifyCustomer,
    customer?.id,
    {
      select: {
        firstName: true,
        tags: true,
      }
    }
  );

  useEffect(() => {
    if (customerRecord?.firstName) {
      setName(customerRecord.firstName);
    }

    if (!Array.isArray(customerRecord?.tags)) {
      return
    }
    if (customerRecord?.tags.includes('efp-member')) {
      setMemberStatus(true);
    }
    if (customerRecord?.tags.includes('efp-discount-5')) {
      setMemberDiscount(5);
    }
    if (customerRecord?.tags.includes('efp-discount-10')) {
      setMemberDiscount(10);
    }

  }, [error, customerRecord]);

  return (
    <Page title={i18n.translate('fullPageTitle')}>
      <Banner>
        {name && i18n.translate('welcomeMessage', { name })}
        {memberStatus && i18n.translate('memberStatus')}
        {memberDiscount > 0 && i18n.translate('memberDiscount', { discount: memberDiscount })}
        {!memberStatus && !fetching && i18n.translate('nonMemberStatus')}
        {fetching && i18n.translate('loading')}
        {error && i18n.translate('error')}
      </Banner>
      <Text>
        {i18n.translate('infoText1')}
      </Text>
      <Text>
        {i18n.translate('infoText2')}
      </Text>
      <Text>
        {i18n.translate('infoText3')}
      </Text>
    </Page>
  )
}