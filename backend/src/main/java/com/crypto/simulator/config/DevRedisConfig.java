package com.crypto.simulator.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Configuration
@Profile("dev")
public class DevRedisConfig {

    @Bean
    public RedisTemplate<String, String> redisTemplate() {
        return new InMemoryRedisTemplate();
    }

    private static class InMemoryRedisTemplate extends RedisTemplate<String, String> {
        private final ConcurrentHashMap<String, String> store = new ConcurrentHashMap<>();
        private final InMemoryValueOperations valueOps = new InMemoryValueOperations(store);

        @Override
        public void afterPropertiesSet() {
            // Bypass assertion requiring connection factory
        }

        @Override
        public ValueOperations<String, String> opsForValue() {
            return valueOps;
        }

        @Override
        public Boolean hasKey(String key) {
            return store.containsKey(key);
        }

        @Override
        public Boolean delete(String key) {
            return store.remove(key) != null;
        }

        @Override
        public Boolean expire(String key, long timeout, TimeUnit unit) {
            return true;
        }

        @Override
        public Boolean expire(String key, Duration timeout) {
            return true;
        }
    }

    private static class InMemoryValueOperations implements ValueOperations<String, String> {
        private final ConcurrentHashMap<String, String> store;

        public InMemoryValueOperations(ConcurrentHashMap<String, String> store) {
            this.store = store;
        }

        @Override
        public void set(String key, String value) {
            store.put(key, value);
        }

        @Override
        public void set(String key, String value, long timeout, TimeUnit unit) {
            store.put(key, value);
        }

        @Override
        public void set(String key, String value, Duration timeout) {
            store.put(key, value);
        }

        @Override
        public String get(Object key) {
            return store.get(key);
        }

        @Override
        public Long increment(String key) {
            String val = store.getOrDefault(key, "0");
            long incremented = Long.parseLong(val) + 1;
            store.put(key, String.valueOf(incremented));
            return incremented;
        }

        @Override public Boolean setIfAbsent(String key, String value) { return null; }
        @Override public Boolean setIfAbsent(String key, String value, long timeout, TimeUnit unit) { return null; }
        @Override public Boolean setIfAbsent(String key, String value, Duration timeout) { return null; }
        @Override public Boolean setIfPresent(String key, String value) { return null; }
        @Override public Boolean setIfPresent(String key, String value, long timeout, TimeUnit unit) { return null; }
        @Override public Boolean setIfPresent(String key, String value, Duration timeout) { return null; }
        @Override public void multiSet(Map<? extends String, ? extends String> map) {}
        @Override public Boolean multiSetIfAbsent(Map<? extends String, ? extends String> map) { return null; }
        @Override public String getAndDelete(String key) { return null; }
        @Override public String getAndExpire(String key, long timeout, TimeUnit unit) { return null; }
        @Override public String getAndExpire(String key, Duration timeout) { return null; }
        @Override public String getAndPersist(String key) { return null; }
        @Override public String getAndSet(String key, String value) { return null; }
        @Override public List<String> multiGet(Collection<String> keys) { return null; }
        @Override public Long increment(String key, long delta) { return null; }
        @Override public Double increment(String key, double delta) { return null; }
        @Override public Long decrement(String key) { return null; }
        @Override public Long decrement(String key, long delta) { return null; }
        @Override public Integer append(String key, String value) { return null; }
        @Override public String get(String key, long start, long end) { return null; }
        @Override public void set(String key, String value, long offset) {}
        @Override public Long size(String key) { return null; }
        @Override public Boolean setBit(String key, long offset, boolean value) { return null; }
        @Override public Boolean getBit(String key, long offset) { return null; }
        @Override public List<Long> bitField(String key, org.springframework.data.redis.connection.BitFieldSubCommands subCommands) { return null; }
        @Override public RedisTemplate<String, String> getOperations() { return null; }
    }
}
