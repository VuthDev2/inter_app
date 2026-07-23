if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/ASUS G 16 JVR/.gradle/caches/9.3.1/transforms/92db18a050ca2048bfbd3d8f5505f599/workspace/transformed/hermes-android-250829098.0.14-debug/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/ASUS G 16 JVR/.gradle/caches/9.3.1/transforms/92db18a050ca2048bfbd3d8f5505f599/workspace/transformed/hermes-android-250829098.0.14-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

