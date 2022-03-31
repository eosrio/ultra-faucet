#include <eosio/eosio.hpp>
using namespace eosio;

CONTRACT faucetsadmin : public contract {

   private:

      TABLE faucet {
         name account;
         uint32_t interval;
         uint64_t max_tokens_per_interval;
         time_point_sec last_transfer;
         uint64_t interval_sum;
         uint64_t primary_key() const {return account.value;}
      };

      using faucet_index = eosio::multi_index<"faucets"_n, faucet>;

   public:
      using contract::contract;

      ACTION givetokens( name faucet, name to );
      ACTION addfaucet(name account, uint32_t interval, uint64_t max_tokens_per_interval);
      ACTION rmfaucet(name account);

      using givetokens_action = action_wrapper<"givetokens"_n, &faucetsadmin::givetokens>;
      using addfaucet_action = action_wrapper<"addfaucet"_n, &faucetsadmin::addfaucet>;
      using rmfaucet_action = action_wrapper<"rmfaucet"_n, &faucetsadmin::rmfaucet>;
};