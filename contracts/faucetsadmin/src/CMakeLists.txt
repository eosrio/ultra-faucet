project(faucetsadmin)

set(EOSIO_WASM_OLD_BEHAVIOR "Off")
find_package(eosio.cdt)

add_contract( faucetsadmin faucetsadmin faucetsadmin.cpp )
target_include_directories( faucetsadmin PUBLIC ${CMAKE_SOURCE_DIR}/../include )
# target_ricardian_directory( faucetsadmin ${CMAKE_SOURCE_DIR}/../ricardian )