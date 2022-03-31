#include <eosio/action.hpp>
#include <faucetsadmin.hpp>
#include <eosio/asset.hpp>
#include <eosio/time.hpp>
#include <eosio/system.hpp>

const int64_t tokens = 500;
const int64_t precision = 100000000;

ACTION faucetsadmin::givetokens(name faucet, name to) {
   require_auth(faucet);

   faucetsadmin::faucet_index faucets(get_self(), get_self().value);
   auto itr = faucets.find(faucet.value);

   check(itr != faucets.end(),"Faucet account not authorized!");

   int64_t faucetAmount = tokens * 100000000;

   uint32_t elapsed = time_point_sec(current_time_point()).sec_since_epoch() - itr->last_transfer.sec_since_epoch();

   if(elapsed < itr->interval) {
      check(itr->max_tokens_per_interval - itr->interval_sum >= tokens, "Cannot issue more tokens on this interval");
   }

   // action(
   //    {get_self(), "active"_n},
   //    "eosio.token"_n,
   //    "issue"_n,
   //    std::make_tuple(
   //       to,
   //       asset(faucetAmount, symbol("UOS",8)),
   //       std::string{""}
   //    )
   //  ).send();

   action(
      {get_self(), "active"_n},
      "eosio.token"_n,
      "transfer"_n,
      std::make_tuple(
         get_self(),
         to,
         asset(faucetAmount, symbol("UOS",8)),
         std::string{""}
      )
    ).send();

   faucets.modify( itr, _self, [&]( auto& row ) {
      if(elapsed >= itr->interval) {
         row.interval_sum = tokens;
      } else {
         row.interval_sum = row.interval_sum + tokens;
      }
      row.last_transfer = time_point_sec(current_time_point());
   });
}

ACTION faucetsadmin::addfaucet(name account, uint32_t interval, uint64_t max_tokens_per_interval) {
   require_auth(name("ultra"));
   check(is_account(account), "account does not exist");

   faucetsadmin::faucet_index faucets(get_self(), get_self().value);
   auto itr = faucets.find(account.value);

   if(itr == faucets.end()) {
      faucets.emplace(name("ultra"), [&](auto &f) {
         f.account = account;
         f.interval = interval;
         f.max_tokens_per_interval = max_tokens_per_interval;
      });
   } else {
      faucets.modify( itr, name("ultra"), [&](auto &f) {
        f.interval = interval;
        f.max_tokens_per_interval = max_tokens_per_interval;
      });
   }
}

ACTION faucetsadmin::rmfaucet(name account) {
   require_auth(name("ultra"));
   check(is_account(account), "account does not exist");

   faucetsadmin::faucet_index faucets(get_self(), get_self().value);
   auto itr = faucets.find(account.value);

   check(itr != faucets.end(),"Faucet does not exist in table, nothing to remove");

   faucets.erase(itr);
}